/* eslint-disable */
import type { Command } from '@commander-js/extra-typings';

import { runCommand } from '@/src/cliHost/exec';
import {
  baseGetDotenvCliOptions,
  type GetDotenvCliOptions,
} from '@/src/cliHost/GetDotenvCliOptions';
import { resolveCliOptions } from '@/src/cliHost/resolveCliOptions';
import { buildSpawnEnv } from '@/src/cliHost/spawnEnv';
import type { RootOptionsShapeCompat } from '@/src/GetDotenvOptions';
import { getDotenvCliOptions2Options } from '@/src/GetDotenvOptions';
import { dotenvExpandFromProcessEnv } from '@/src/dotenvExpand';
import type { EntropyOptions } from '@/src/diagnostics/entropy';
import { maybeWarnEntropy } from '@/src/diagnostics/entropy';
import type { RedactOptions } from '@/src/diagnostics/redact';
import { redactTriple } from '@/src/diagnostics/redact';
import { resolveCommand, resolveShell } from '@/src/services/batch/resolve';
import { tokenize } from '../tokenize';
import type { RootOptionsShape, ScriptsTable } from '@/src/cliHost/types';
import type { GetDotenvCliPublic } from '@/src/cliHost/definePlugin';

const dbg = (...args: unknown[]) => {
  if (process.env.GETDOTENV_DEBUG) {
    // Use stderr to avoid interfering with stdout assertions
    console.error('[getdotenv:alias]', ...args);
  }
};

// Strip one symmetric outer quote layer
const stripOne = (s: string) => {
  if (s.length < 2) return s;
  const a = s.charAt(0);
  const b = s.charAt(s.length - 1);
  const symmetric = (a === '"' && b === '"') || (a === "'" && b === "'");
  return symmetric ? s.slice(1, -1) : s;
};

// Narrow unknown errors that may carry an exitCode (execa-like).
const hasExitCode = (
  e: unknown,
): e is {
  exitCode?: unknown;
} => typeof e === 'object' && e !== null && 'exitCode' in e;

export async function maybeRunAlias(
  cli: GetDotenvCliPublic,
  thisCommand: Command,
  aliasKey: string,
  state: { handled: boolean },
  expandDefault?: boolean,
): Promise<void> {
  dbg('alias:maybe:start');
  const raw = (thisCommand as unknown as { rawArgs?: string[] }).rawArgs ?? [];
  const childNames = thisCommand.commands.flatMap((c) => [
    c.name(),
    ...c.aliases(),
  ]);
  const hasSub = childNames.some((n) => raw.includes(n));
  const o = (
    thisCommand as unknown as Command & { opts: () => Record<string, unknown> }
  ).opts();
  const val = (o as Record<string, unknown>)[aliasKey];
  const provided =
    typeof val === 'string'
      ? val.length > 0
      : Array.isArray(val)
        ? val.length > 0
        : false;
  if (!provided || hasSub) {
    dbg('alias:maybe:skip', { provided, hasSub });
    return; // not an alias-only invocation
  }
  if (state.handled) {
    dbg('alias:maybe:already-handled');
    return;
  }
  state.handled = true;
  dbg('alias-only invocation detected');

  // Merge CLI options and resolve dotenv context.
  const { merged } = resolveCliOptions<
    RootOptionsShape & { scripts?: ScriptsTable }
  >(
    o,
    baseGetDotenvCliOptions as Partial<RootOptionsShape>,
    process.env.getDotenvCliOptions,
  );
  const mergedBag = merged as unknown as GetDotenvCliOptions;
  const {
    logger,
    debug,
    capture: mergedCapture,
    shell,
    trace,
    redact,
    redactPatterns,
    warnEntropy,
    entropyThreshold,
    entropyMinLength,
    entropyWhitelist,
  } = mergedBag;

  const serviceOptions = getDotenvCliOptions2Options(
    mergedBag as unknown as RootOptionsShapeCompat,
  );
  await cli.resolveAndLoad(serviceOptions);

  // Normalize alias value
  const joined =
    typeof val === 'string'
      ? val
      : Array.isArray(val)
        ? (val as unknown[]).map(String).join(' ')
        : '';
  const expanded = dotenvExpandFromProcessEnv(joined);
  // Effective expansion: merged CLI override > plugin config default > true
  const expandOverride = (mergedBag as { expand?: boolean }).expand;
  const effectiveExpand =
    typeof expandOverride === 'boolean'
      ? expandOverride
      : expandDefault === false
        ? false
        : true;
  const input = effectiveExpand && expanded !== undefined ? expanded : joined;

  // Scripts: prefer well-formed records; tolerate absent
  const scripts = (mergedBag as { scripts?: ScriptsTable | undefined }).scripts;

  const resolved = resolveCommand(scripts, input);
  if (debug) {
    logger.debug('\n*** command ***\n', `'${resolved}'`);
  }
  // Round-trip CLI options for nested getdotenv invocations. Omit logger
  // (functions/circulars) and guard JSON serialization to avoid hard failures.
  const { logger: _omitLogger, ...envBag } = mergedBag as unknown as Record<
    string,
    unknown
  >;
  let nestedBag: string | undefined;
  try {
    nestedBag = JSON.stringify(envBag);
  } catch {
    nestedBag = undefined;
  }
  const underTests =
    process.env.GETDOTENV_TEST === '1' ||
    typeof process.env.VITEST_WORKER_ID === 'string';
  const forceExit = process.env.GETDOTENV_FORCE_EXIT === '1';
  const capture =
    !underTests &&
    (process.env.GETDOTENV_STDIO === 'pipe' || Boolean(mergedCapture));
  dbg('run:start', {
    capture,
    shell,
  });

  const dotenv = cli.getCtx().dotenv;

  // Diagnostics: --trace [keys...]
  const traceOpt = trace;
  if (traceOpt) {
    const parentKeys = Object.keys(process.env);
    const dotenvKeys = Object.keys(dotenv);
    const allKeys = Array.from(new Set([...parentKeys, ...dotenvKeys])).sort();
    const keys = Array.isArray(traceOpt) ? traceOpt : allKeys;
    const childEnvPreview: Record<string, string | undefined> = {
      ...process.env,
      ...dotenv,
    };
    for (const k of keys) {
      const parent = process.env[k];
      const dot = dotenv[k];
      const final = childEnvPreview[k];
      const origin =
        dot !== undefined
          ? 'dotenv'
          : parent !== undefined
            ? 'parent'
            : 'unset';
      const redOpts: RedactOptions = redact
        ? {
            redact: true,
            ...(Array.isArray(redactPatterns) ? { redactPatterns } : {}),
          }
        : {};
      const tripleBag: { parent?: string; dotenv?: string; final?: string } =
        {};
      if (parent !== undefined) tripleBag.parent = parent;
      if (dot !== undefined) tripleBag.dotenv = dot;
      if (final !== undefined) tripleBag.final = final;
      const triple = redactTriple(k, tripleBag, redOpts);
      process.stderr.write(
        `[trace] key=${k} origin=${origin} parent=${triple.parent ?? ''} dotenv=${triple.dotenv ?? ''} final=${triple.final ?? ''}\n`,
      );
      const entOpts: EntropyOptions = {
        ...(typeof warnEntropy === 'boolean' ? { warnEntropy } : {}),
        ...(typeof entropyThreshold === 'number' ? { entropyThreshold } : {}),
        ...(typeof entropyMinLength === 'number' ? { entropyMinLength } : {}),
        ...(Array.isArray(entropyWhitelist) ? { entropyWhitelist } : {}),
      };
      maybeWarnEntropy(k, final, origin, entOpts, (line) =>
        process.stderr.write(line + '\n'),
      );
    }
  }
  const shellSetting = resolveShell(scripts, input, shell);
  // Preserve argv array for Node -e snippets under shell-off
  let commandArg: string | string[] = resolved;
  if (shellSetting === false && resolved === input) {
    // Important: preserve doubled quotes within the Node -e payload so
    // empty string literals ("") survive; Windows-style doubling must not
    // collapse "" -> " in this path.
    const parts = tokenize(input, { preserveDoubledQuotes: true });
    if (
      parts.length >= 3 &&
      parts[0]?.toLowerCase() === 'node' &&
      (parts[1] === '-e' || parts[1] === '--eval')
    ) {
      // Peel exactly one symmetric outer quote on the code arg
      parts[2] = stripOne(parts[2] ?? '');
      // Historical behavior: pass the argv array through unchanged for shell-off.
      commandArg = parts;
    }
  }
  let exitCode = Number.NaN;
  try {
    exitCode = await runCommand(commandArg, shellSetting, {
      env: buildSpawnEnv(process.env, {
        ...dotenv,
        ...(nestedBag ? { getDotenvCliOptions: nestedBag } : {}),
      }),
      stdio: capture ? 'pipe' : 'inherit',
    });
    dbg('run:done', { exitCode });
  } catch (err) {
    // Extract a numeric exitCode when present; default to 1
    let code = 1;
    if (hasExitCode(err) && typeof err.exitCode === 'number') {
      code = err.exitCode;
    }
    dbg('run:error', { exitCode: code, error: String(err) });
    if (!underTests) {
      dbg('process.exit (error path)', { exitCode: code });
      process.exit(code);
    } else {
      dbg('process.exit suppressed for tests (error path)', {
        exitCode: code,
      });
    }
    return;
  }
  if (!Number.isNaN(exitCode)) {
    dbg('process.exit', { exitCode });
    process.exit(exitCode);
  }
  if (!underTests) {
    dbg('process.exit (fallback: non-numeric exitCode)', { exitCode: 0 });
    process.exit(0);
  } else {
    dbg('process.exit (fallback suppressed for tests: non-numeric exitCode)', {
      exitCode: 0,
    });
  }
  if (forceExit) {
    setImmediate(() => process.exit(Number.isNaN(exitCode) ? 0 : exitCode));
  }
}
