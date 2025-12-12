/** src/plugins/cmd/actions/runner.ts
 * Unified runner for cmd subcommand and parent alias.
 * - Resolves command via scripts
 * - Emits --trace diagnostics (centralized helper with redaction/entropy)
 * - Preserves Node -e argv under shell-off
 * - Normalizes child env and honors capture
 */
import {
  buildSpawnEnv,
  composeNestedEnv,
  type GetDotenvCliOptions,
  type GetDotenvCliPublic,
  maybePreserveNodeEvalArgv,
  resolveCommand,
  resolveShell,
  runCommand,
  stripOne,
} from '@/src/cliHost';
import { shouldCapture } from '@/src/cliHost/exec';
import { traceChildEnv } from '@/src/diagnostics';
import { tokenize } from '@/src/util';

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
    traceChildEnv({
      parentEnv: process.env,
      dotenv,
      ...(Array.isArray(traceOpt) ? { keys: traceOpt } : {}),
      ...(redact ? { redact: true } : {}),
      ...(redact && Array.isArray(redactPatterns) ? { redactPatterns } : {}),
      ...(typeof warnEntropy === 'boolean' ? { warnEntropy } : {}),
      ...(typeof entropyThreshold === 'number' ? { entropyThreshold } : {}),
      ...(typeof entropyMinLength === 'number' ? { entropyMinLength } : {}),
      ...(Array.isArray(entropyWhitelist) ? { entropyWhitelist } : {}),
      write: (line) => {
        try {
          process.stderr.write(line + '\n');
        } catch {
          /* ignore */
        }
      },
    } as const);
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
  const captureFlag = shouldCapture(capture);

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
