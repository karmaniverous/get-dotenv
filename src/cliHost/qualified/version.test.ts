/**
 * 4.11 checklist 13: the qualified version option prints the version.
 *
 * `--<alias>-version` is normalized to `--version` (owned by the root, so it
 * goes to index 0) and Commander prints the host's version and exits 0. Run
 * end to end: in this process through the S1 `vc` fixture host's runner and
 * the shipped `getdotenv` host, and in a child process through the `vc`
 * fixture entry and the shipped `getdotenv` entry, where Commander's
 * `process.exit` is real.
 *
 * The version line is followed by a blank line, as in 7.0.11 (baseline case
 * `version vc`), so stdout is compared with its trailing newlines trimmed.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { execa } from 'execa';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  createGetdotenvHost,
  createVcHost,
  type Runner,
} from '@/test/baseline/hosts';
import { inFixture } from '@/test/support/fixtureCli';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
);

/** The version both hosts report: get-dotenv's own `package.json`. */
const { version } = JSON.parse(
  readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
) as { version: string };

/** Thrown by the `process.exit` stand-in, to stop the run there. */
class ExitSignal extends Error {}

/**
 * Run a host in this process.
 *
 * @returns Its stdout (trailing newlines trimmed) and the code of its first
 *   `process.exit` call.
 */
const runInProcess = async (
  create: () => Runner,
  argv: string[],
): Promise<{ stdout: string; exitCode: number | undefined }> => {
  let stdout = '';
  let exitCode: number | undefined;
  const write = vi.spyOn(process.stdout, 'write').mockImplementation((c) => {
    stdout += String(c);
    return true;
  });
  const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
    exitCode ??= typeof code === 'number' ? code : 0;
    throw new ExitSignal();
  });
  const prevExitCode = process.exitCode;
  try {
    await inFixture({}, async () => {
      try {
        await create()(argv);
      } catch (e) {
        if (!(e instanceof ExitSignal)) throw e;
      }
    });
  } finally {
    process.exitCode = prevExitCode;
    write.mockRestore();
    exit.mockRestore();
  }
  return { stdout: stdout.trimEnd(), exitCode };
};

describe('qualified --<alias>-version (4.11 checklist 13), in process', () => {
  it.each([['--vc-version'], ['--version'], ['-V']])(
    'vc %s prints the version and exits 0',
    async (flag) => {
      expect(await runInProcess(createVcHost, [flag])).toEqual({
        stdout: version,
        exitCode: 0,
      });
    },
  );

  it.each([['--getdotenv-version'], ['-V']])(
    'getdotenv %s prints the version and exits 0',
    async (flag) => {
      expect(await runInProcess(createGetdotenvHost, [flag])).toEqual({
        stdout: version,
        exitCode: 0,
      });
    },
  );

  it('vc smoz --vc-version still prints the version (the root owns it)', async () => {
    expect(await runInProcess(createVcHost, ['smoz', '--vc-version'])).toEqual({
      stdout: version,
      exitCode: 0,
    });
  });
});

describe('qualified --<alias>-version (4.11 checklist 13), child process', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'gdv-version-'));
    writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'fixture', type: 'module' }),
    );
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  /** Run a host entry in a child process (no Vitest, so a real exit). */
  const runChild = async (entry: string, argv: string[]) => {
    const env: NodeJS.ProcessEnv = {};
    for (const [k, v] of Object.entries(process.env))
      if (!/^(VITEST|GETDOTENV_)/i.test(k)) env[k] = v;
    env.TSX_TSCONFIG_PATH = path.join(repoRoot, 'tsconfig.json');
    const r = await execa(
      process.execPath,
      ['--import', import.meta.resolve('tsx'), entry, ...argv],
      {
        cwd: dir,
        env,
        extendEnv: false,
        reject: false,
        stdin: 'ignore',
      },
    );
    return {
      stdout: r.stdout.trimEnd(),
      stderr: r.stderr,
      exitCode: r.exitCode,
    };
  };

  const vcEntry = path.join(repoRoot, 'test', 'baseline', 'vcEntry.ts');
  const getdotenvEntry = path.join(
    repoRoot,
    'src',
    'cli',
    'getdotenv',
    'index.ts',
  );

  it.each([['--vc-version'], ['-V']])(
    'vc %s prints the version and exits 0',
    async (flag) => {
      expect(await runChild(vcEntry, [flag])).toEqual({
        stdout: version,
        stderr: '',
        exitCode: 0,
      });
    },
  );

  it.each([['--getdotenv-version'], ['-V']])(
    'getdotenv %s prints the version and exits 0',
    async (flag) => {
      expect(await runChild(getdotenvEntry, [flag])).toEqual({
        stdout: version,
        stderr: '',
        exitCode: 0,
      });
    },
  );
});
