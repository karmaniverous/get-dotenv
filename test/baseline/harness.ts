/**
 * Runs one baseline case and records its outcome.
 *
 * Each case gets a fresh temporary directory (the working directory of the
 * run) holding the default fixture files, the case's own files and a copy of
 * the probe in the root and in `pkgA`/`pkgB`. The ambient environment is
 * controlled: `GETDOTENV_*` and `AWS_*` variables are removed,
 * `BASELINE_AMBIENT` is set, and the AWS CLI config files point at missing
 * paths. In-process runs also set `GETDOTENV_STDIO=pipe` (as the repo's own
 * e2e tests do), so child output is captured and top-level help prints under
 * Vitest.
 *
 * Recorded per CLI case: the options bag, the children the probe saw (argv,
 * redacted env difference, the `getDotenvCliOptions` they received), stubbed
 * AWS CLI calls, the exit code, stdout and stderr. Everything is normalized
 * (`normalize.ts`).
 */
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { formatWithOptions } from 'node:util';

import { execa } from 'execa';

import { takeAwsCalls } from './awsStub';
import { resetBag, takeBag } from './bagRecorder';
import { hosts } from './hosts';
import {
  normalizeStream,
  normalizeText,
  normalizeValue,
  setCaseRoots,
} from './normalize';
import type {
  AwsRecord,
  BaselineCase,
  CaseRecord,
  CliCase,
  EnvDiff,
  ProbeRecord,
} from './types';

const here = import.meta.dirname;
const repoRoot = path.resolve(here, '..', '..');
const isWin = process.platform === 'win32';

/** Default files in every case directory. */
const defaultFiles: Record<string, string> = {
  'package.json': JSON.stringify(
    { name: 'baseline-fixture', private: true, type: 'module' },
    null,
    2,
  ),
  '.env': 'APP=base\n',
  '.env.bali': 'STAGE=bali\n',
  '.env.dev': 'STAGE=dev\n',
};

/** Env keys that shells set or rewrite in their children (not get-dotenv's). */
const shellNoiseKeys = new Set(
  ['_', 'SHLVL', 'PWD', 'OLDPWD', 'PSModulePath'].map((k) =>
    isWin ? k.toLowerCase() : k,
  ),
);

/** Thrown by the `process.exit` stand-in to stop the run at that point. */
class BaselineExit extends Error {
  constructor() {
    super('baseline: process.exit');
  }
}

const hash = (value: string): string =>
  createHash('sha256').update(normalizeText(value)).digest('hex').slice(0, 12);

const envKey = (k: string) => (isWin ? k.toLowerCase() : k);

/**
 * Redacted difference between the env a run started with and a child's env.
 *
 * @param base - Env at the start of the run.
 * @param child - Env the child received.
 * @returns Keys added, changed and removed; values hashed.
 */
const diffEnv = (
  base: NodeJS.ProcessEnv,
  child: NodeJS.ProcessEnv,
): EnvDiff => {
  const baseMap = new Map<string, string | undefined>();
  for (const [k, v] of Object.entries(base)) baseMap.set(envKey(k), v);
  const seen = new Set<string>();
  const added: Record<string, string> = {};
  const changed: Record<string, string> = {};
  for (const [k, v] of Object.entries(child)) {
    const lk = envKey(k);
    seen.add(lk);
    if (shellNoiseKeys.has(lk) || v === undefined) continue;
    if (!baseMap.has(lk)) added[k] = hash(v);
    else if (normalizeText(baseMap.get(lk) ?? '') !== normalizeText(v))
      changed[k] = hash(v);
  }
  const removed = [...baseMap.keys()]
    .filter((k) => !seen.has(k) && !shellNoiseKeys.has(k))
    .sort();
  return { added, changed, removed };
};

const parseJson = (s: string | undefined): unknown => {
  if (s === undefined) return null;
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return s;
  }
};

const exitCodeOf = (code: unknown): number | string | null => {
  if (code === undefined || code === null) return null;
  if (typeof code === 'number' && Number.isInteger(code)) return code;
  if (typeof code === 'string' && /^\d+$/.test(code)) return Number(code);
  return typeof code === 'number' ? String(code) : JSON.stringify(code);
};

/** Read `process.exitCode` (a function, so assignments don't narrow it). */
const currentExitCode = (): typeof process.exitCode => process.exitCode;

/** Create the case directory. */
const makeCaseDir = (c: BaselineCase): string => {
  // Canonical long path (Windows temp dirs can come back as 8.3 short names).
  const dir = realpathSync.native(
    mkdtempSync(path.join(os.tmpdir(), 'gdv-baseline-')),
  );
  const files: Record<string, string | null> = {
    ...defaultFiles,
    ...(c.files ?? {}),
  };
  for (const [rel, content] of Object.entries(files)) {
    if (content === null) continue;
    const abs = path.join(dir, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  for (const sub of ['.', 'pkgA', 'pkgB']) {
    mkdirSync(path.join(dir, sub), { recursive: true });
    copyFileSync(
      path.join(here, 'probe.mjs'),
      path.join(dir, sub, 'probe.mjs'),
    );
  }
  return dir;
};

/**
 * Ambient variables a case keeps: what Node, the shells and Vitest need. Every
 * other variable of the test process is removed for the run, so no recorded
 * output depends on (or leaks) the machine's environment. `HOME` is dropped
 * too: whether it is set depends on the launcher (npm sets it on Windows), and
 * on Windows get-dotenv adds it to child envs when it is missing.
 */
const keptAmbient =
  /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|TMPDIR|USERPROFILE|APPDATA|LOCALAPPDATA|HOMEDRIVE|HOMEPATH|SYSTEMDRIVE|PROGRAMDATA|PROGRAMFILES(\(X86\))?|PROGRAMW6432|COMMONPROGRAMFILES(\(X86\))?|COMMONPROGRAMW6432|LANG|LC_[A-Z]+|TERM|SHELL|USER|LOGNAME|NODE_[A-Z0-9_]+|VITEST[A-Z_]*|TEST|MODE|DEV|PROD|SSR|BASE_URL)$/i;

/** The controlled ambient env of a case. */
const caseEnv = (c: BaselineCase, dir: string): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(process.env))
    if (keptAmbient.test(k)) env[k] = v;
  env.BASELINE_PROBE_DIR = dir;
  env.BASELINE_AMBIENT = 'ambient-value';
  env.AWS_CONFIG_FILE = path.join(dir, '.aws-none', 'config');
  env.AWS_SHARED_CREDENTIALS_FILE = path.join(dir, '.aws-none', 'credentials');
  return { ...env, ...(c.env ?? {}) };
};

/** Replace the contents of process.env in place. */
const replaceProcessEnv = (next: NodeJS.ProcessEnv) => {
  for (const k of Object.keys(process.env))
    if (!(k in next)) Reflect.deleteProperty(process.env, k);
  for (const [k, v] of Object.entries(next))
    if (v === undefined) Reflect.deleteProperty(process.env, k);
    else process.env[k] = v;
};

/** Collect what the probe saw. */
const readProbes = (dir: string, base: NodeJS.ProcessEnv): ProbeRecord[] => {
  const file = path.join(dir, 'probe.jsonl');
  if (!existsSync(file)) return [];
  const records = readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.length > 0)
    .map((l) => {
      const p = JSON.parse(l) as {
        argv: string[];
        cwd: string;
        env: NodeJS.ProcessEnv;
      };
      return {
        argv: p.argv,
        cwd: path.relative(dir, p.cwd).split(path.sep).join('/') || '.',
        env: diffEnv(base, p.env),
        getDotenvCliOptions: parseJson(p.env.getDotenvCliOptions),
      };
    });
  return records.sort((a, b) =>
    JSON.stringify([a.cwd, a.argv]).localeCompare(
      JSON.stringify([b.cwd, b.argv]),
    ),
  );
};

const awsRecords = (base: NodeJS.ProcessEnv): AwsRecord[] =>
  takeAwsCalls().map((call) => ({
    kind: call.kind,
    command: call.command,
    shell: call.shell,
    ...(call.env
      ? {
          env: diffEnv(base, call.env),
          getDotenvCliOptions: parseJson(call.env.getDotenvCliOptions),
        }
      : {}),
  }));

const listTree = (dir: string): string[] => {
  const out: string[] = [];
  const walk = (rel: string) => {
    for (const name of readdirSync(path.join(dir, rel))) {
      const r = rel ? `${rel}/${name}` : name;
      if (r === 'probe.jsonl' || name === 'node_modules') continue;
      if (statSync(path.join(dir, r)).isDirectory()) walk(r);
      else out.push(r);
    }
  };
  walk('');
  return out.sort();
};

/** Captured output and exit state of an in-process run. */
interface Capture {
  stdout: string;
  stderr: string;
  exitCode: number | string | null;
  processExitCalled: boolean;
  rejected: string[];
}

/**
 * Run `fn` with stdout, stderr, the console and `process.exit` captured.
 * `process.exit` records its code and throws, which stops the run there;
 * output after it is discarded, as it would never be written.
 */
const captureInProcess = async (
  fn: (stopped: () => boolean) => Promise<void>,
): Promise<Capture> => {
  const out: string[] = [];
  const err: string[] = [];
  // An object, so TS doesn't narrow fields the closures below mutate.
  const state: { frozen: boolean; exitCode: number | string | null } = {
    frozen: false,
    exitCode: null,
  };
  const rejected: string[] = [];

  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  const origExit = process.exit.bind(process);
  const origExitCode = process.exitCode;
  const consoleMethods = [
    'log',
    'info',
    'debug',
    'trace',
    'warn',
    'error',
  ] as const;
  const origConsole = consoleMethods.map(
    (m) => [m, console[m].bind(console)] as const,
  );

  process.exitCode = undefined;
  process.stdout.write = (chunk: string | Uint8Array) => {
    if (!state.frozen)
      out.push(
        typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString(),
      );
    return true;
  };
  process.stderr.write = (chunk: string | Uint8Array) => {
    if (!state.frozen)
      err.push(
        typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString(),
      );
    return true;
  };
  for (const m of consoleMethods) {
    const sink = m === 'warn' || m === 'error' ? err : out;
    console[m] = (...args: unknown[]) => {
      if (!state.frozen)
        sink.push(formatWithOptions({ colors: false }, ...args) + '\n');
    };
  }
  process.exit = (code?: number | string | null) => {
    if (!state.frozen) {
      state.exitCode = exitCodeOf(code ?? currentExitCode() ?? 0);
      state.frozen = true;
    }
    throw new BaselineExit();
  };

  try {
    await fn(() => state.frozen);
  } catch (e) {
    if (!(e instanceof BaselineExit) && !state.frozen)
      rejected.push(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
  } finally {
    process.stdout.write = origOut;
    process.stderr.write = origErr;
    process.exit = origExit;
    for (const [m, f] of origConsole) console[m] = f;
  }
  const processExitCalled = state.frozen;
  const exitCode = processExitCalled
    ? state.exitCode
    : exitCodeOf(currentExitCode() ?? 0);
  process.exitCode = origExitCode;
  return {
    stdout: out.join(''),
    stderr: err.join(''),
    exitCode,
    processExitCalled,
    rejected,
  };
};

const runCliInProcess = async (c: CliCase): Promise<Capture> => {
  const runner = typeof c.host === 'function' ? c.host() : hosts[c.host]();
  const alias = typeof c.host === 'string' ? c.host : 'custom';
  const argv = c.argvForm === 'args' ? c.args : ['node', alias, ...c.args];
  process.env.GETDOTENV_STDIO = 'pipe';
  return captureInProcess(async (stopped) => {
    const errors: string[] = [];
    for (let i = 0; i < (c.runs ?? 1) && !stopped(); i++) {
      try {
        // The full form is process.argv-shaped: { from: 'node' } (#53).
        await (c.argvForm === 'args'
          ? runner([...argv])
          : runner([...argv], { from: 'node' }));
      } catch (e) {
        if (e instanceof BaselineExit) throw e;
        if (!stopped())
          errors.push(
            `run ${String(i + 1)}: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`,
          );
      }
    }
    if (errors.length > 0) throw new Error(errors.join(' | '));
  });
};

const runCliChild = async (
  c: CliCase,
  dir: string,
  env: NodeJS.ProcessEnv,
): Promise<Capture & { bag: unknown; childEnv: NodeJS.ProcessEnv }> => {
  if (typeof c.host !== 'string')
    throw new Error(`${c.id}: child mode needs a named host`);
  if (c.args.includes('aws'))
    throw new Error(`${c.id}: child mode cannot stub the AWS CLI`);
  const recordFile = path.join(dir, '.baseline-record.json');
  const childEnv: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(env))
    if (!/^(VITEST|GETDOTENV_)/i.test(k)) childEnv[k] = v;
  childEnv.TSX_TSCONFIG_PATH = path.join(repoRoot, 'tsconfig.json');
  childEnv.BASELINE_RECORD_FILE = recordFile;
  const entry =
    c.host === 'getdotenv'
      ? path.join(repoRoot, 'src', 'cli', 'getdotenv', 'index.ts')
      : path.join(here, 'vcEntry.ts');
  const r = await execa(
    process.execPath,
    [
      '--import',
      import.meta.resolve('tsx'),
      '--import',
      pathToFileURL(path.join(here, 'childRecorder.ts')).href,
      entry,
      ...c.args,
    ],
    {
      cwd: dir,
      env: childEnv,
      extendEnv: false,
      reject: false,
      stdin: 'ignore',
      stripFinalNewline: false,
    },
  );
  const bag = existsSync(recordFile)
    ? (JSON.parse(readFileSync(recordFile, 'utf8')) as { bag: unknown }).bag
    : null;
  rmSync(recordFile, { force: true });
  return {
    stdout: r.stdout,
    stderr: r.stderr,
    exitCode: exitCodeOf(r.exitCode),
    processExitCalled: false,
    rejected: [],
    bag,
    childEnv,
  };
};

/**
 * Run one case and return its normalized record.
 *
 * @param c - The case.
 * @returns The record.
 */
export const runCase = async (c: BaselineCase): Promise<CaseRecord> => {
  const dir = makeCaseDir(c);
  const savedEnv = { ...process.env };
  const savedCwd = process.cwd();
  setCaseRoots({ '<TMP>': dir });
  resetBag();
  takeAwsCalls();
  const env = caseEnv(c, dir);
  try {
    replaceProcessEnv(env);
    process.chdir(dir);
    let record: CaseRecord;
    if (c.kind === 'lib') {
      let result: unknown = null;
      const cap = await captureInProcess(async () => {
        result = await c.run(dir);
      });
      record = {
        source: c.source,
        result: result ?? null,
        exitCode: cap.exitCode,
        ...(cap.processExitCalled ? { processExitCalled: true } : {}),
        ...(cap.rejected.length > 0
          ? { rejected: cap.rejected.join('\n') }
          : {}),
        stdout: cap.stdout,
        stderr: cap.stderr,
      };
    } else {
      const child = c.mode === 'child';
      const argvBase =
        c.argvForm === 'args'
          ? []
          : [typeof c.host === 'string' ? c.host : 'custom'];
      let cap: Capture;
      let bag: unknown;
      let probeBase = env;
      if (child) {
        const r = await runCliChild(c, dir, env);
        cap = r;
        bag = r.bag;
        probeBase = r.childEnv;
      } else {
        const startEnv = { ...env, GETDOTENV_STDIO: 'pipe' };
        probeBase = startEnv;
        cap = await runCliInProcess(c);
        bag = takeBag();
      }
      const children = readProbes(dir, probeBase);
      const aws = awsRecords(probeBase);
      record = {
        source: c.source,
        argv: [...argvBase, ...c.args],
        ...(child ? { mode: 'child' as const } : {}),
        exitCode: cap.exitCode,
        ...(cap.processExitCalled ? { processExitCalled: true } : {}),
        ...(cap.rejected.length > 0
          ? { rejected: cap.rejected.join('\n') }
          : {}),
        stdout: cap.stdout,
        stderr: cap.stderr,
        bag,
        children,
        ...(aws.length > 0 ? { aws } : {}),
      };
    }
    if (c.readFiles) {
      const files: Record<string, string | null> = {};
      for (const rel of c.readFiles) {
        const abs = path.join(dir, rel);
        files[rel] = existsSync(abs) ? readFileSync(abs, 'utf8') : null;
      }
      record.files = files;
    }
    if (c.listFiles) record.tree = listTree(dir);
    const normalized = normalizeValue(record) as CaseRecord;
    normalized.stdout = normalizeStream(record.stdout);
    normalized.stderr = normalizeStream(record.stderr);
    return normalized;
  } finally {
    process.chdir(savedCwd);
    replaceProcessEnv(savedEnv);
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
    } catch {
      /* best effort (Windows may hold a handle briefly) */
    }
  }
};
