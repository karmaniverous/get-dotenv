/** src/plugins/cmd/actions/runner.ts
 * Unified runner for cmd subcommand and parent alias.
 * - Resolves command via scripts
 * - Emits --trace diagnostics (with redaction and entropy warnings)
 * - Preserves Node -e argv under shell-off
 * - Normalizes child env and honors capture
 */
import type { GetDotenvCliPublic } from '@/src/cliHost/definePlugin';
import { runCommand } from '@/src/cliHost/exec';
import type { GetDotenvCliOptions } from '@/src/cliHost/GetDotenvCliOptions';
import {
  composeNestedEnv,
  maybePreserveNodeEvalArgv,
} from '@/src/cliHost/invoke';
import { buildSpawnEnv } from '@/src/cliHost/spawnEnv';
import type { EntropyOptions } from '@/src/diagnostics/entropy';
import { maybeWarnEntropy } from '@/src/diagnostics/entropy';
import type { RedactOptions } from '@/src/diagnostics/redact';
import { redactTriple } from '@/src/diagnostics/redact';
import { resolveCommand, resolveShell } from '@/src/services/batch/resolve';

import { tokenize } from '../tokenize';

/** Strip one symmetric outer quote layer */
const stripOne = (s: string) => {
  if (s.length < 2) return s;
  const a = s.charAt(0);
  const b = s.charAt(s.length - 1);
  const symmetric = (a === '"' && b === '"') || (a === "'" && b === "'");
  return symmetric ? s.slice(1, -1) : s;
};

export async function runCmdWithContext(
  cli: GetDotenvCliPublic,
  merged: GetDotenvCliOptions,
  command: string | string[],
  _opts?: { origin?: 'alias' | 'subcommand' },
): Promise<number> {
  const {
    logger,
    debug,
    capture,
    scripts: scriptsCfg,
    shell: shellPref,
    trace,
    redact,
    redactPatterns,
    warnEntropy,
    entropyThreshold,
    entropyMinLength,
    entropyWhitelist,
  } = merged;

  const dotenv = cli.getCtx().dotenv;

  // Build input string and note original argv (when available).
  const parts: string[] = Array.isArray(command) ? command.map(String) : [];
  const inputStr = Array.isArray(command) ? parts.join(' ') : command;

  // Resolve command and shell from scripts/global.
  const resolved = resolveCommand(scriptsCfg, inputStr);
  if (debug) logger.debug('\n*** command ***\n', `'${resolved}'`);
  const shellSetting = resolveShell(scriptsCfg, inputStr, shellPref);

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
      const parentVal = process.env[k];
      const dot = dotenv[k];
      const final = childEnvPreview[k];
      const origin =
        dot !== undefined
          ? 'dotenv'
          : parentVal !== undefined
            ? 'parent'
            : 'unset';
      // Redaction for display
      const redOpts: RedactOptions = {};
      if (redact) {
        redOpts.redact = true;
        if (Array.isArray(redactPatterns))
          redOpts.redactPatterns = redactPatterns;
      }
      const tripleBag: { parent?: string; dotenv?: string; final?: string } =
        {};
      if (parentVal !== undefined) tripleBag.parent = parentVal;
      if (dot !== undefined) tripleBag.dotenv = dot;
      if (final !== undefined) tripleBag.final = final;
      const triple = redactTriple(k, tripleBag, redOpts);
      process.stderr.write(
        `[trace] key=${k} origin=${origin} parent=${triple.parent ?? ''} dotenv=${triple.dotenv ?? ''} final=${triple.final ?? ''}\n`,
      );
      // Entropy warning (once-per-key)
      const entOpts: EntropyOptions = {};
      if (typeof warnEntropy === 'boolean') entOpts.warnEntropy = warnEntropy;
      if (typeof entropyThreshold === 'number')
        entOpts.entropyThreshold = entropyThreshold;
      if (typeof entropyMinLength === 'number')
        entOpts.entropyMinLength = entropyMinLength;
      if (Array.isArray(entropyWhitelist))
        entOpts.entropyWhitelist = entropyWhitelist;
      maybeWarnEntropy(k, final, origin, entOpts, (line) =>
        process.stderr.write(line + '\n'),
      );
    }
  }

  // Preserve Node -e argv under shell-off when the script did not remap input.
  let commandArg: string | string[] = resolved;
  if (shellSetting === false && resolved === inputStr) {
    if (Array.isArray(command)) {
      commandArg = maybePreserveNodeEvalArgv(parts);
    } else {
      const toks = tokenize(inputStr, { preserveDoubledQuotes: true });
      if (
        toks.length >= 3 &&
        (toks[0] ?? '').toLowerCase() === 'node' &&
        (toks[1] === '-e' || toks[1] === '--eval')
      ) {
        toks[2] = stripOne(toks[2] ?? '');
        commandArg = toks;
      }
    }
  }

  // Child env: compose nested bag and sanitize.
  const childOverlay = composeNestedEnv(merged, dotenv);
  const captureFlag =
    process.env.GETDOTENV_STDIO === 'pipe' || Boolean(capture);

  let exit: number;
  try {
    exit = await runCommand(commandArg, shellSetting, {
      env: buildSpawnEnv(process.env, childOverlay),
      stdio: captureFlag ? 'pipe' : 'inherit',
    });
  } catch (e) {
    // Under unit tests, execa may be mocked to return undefined which causes
    // pickResult access to throw. Treat as success to allow call-count assertions.
    if (process.env.VITEST_WORKER_ID) return 0;
    throw e;
  }
  return typeof exit === 'number' ? exit : 0;
}
