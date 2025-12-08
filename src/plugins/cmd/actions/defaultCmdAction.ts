import type { Command, CommandUnknownOpts } from '@commander-js/extra-typings';

import type { GetDotenvCliPublic } from '@/src/cliHost/definePlugin';
import { runCommand } from '@/src/cliHost/exec';
import { maybePreserveNodeEvalArgv } from '@/src/cliHost/invoke';
import { readMergedOptions } from '@/src/cliHost/readMergedOptions';
import { buildSpawnEnv } from '@/src/cliHost/spawnEnv';
import type { EntropyOptions } from '@/src/diagnostics/entropy';
import { maybeWarnEntropy } from '@/src/diagnostics/entropy';
import type { RedactOptions } from '@/src/diagnostics/redact';
import { redactTriple } from '@/src/diagnostics/redact';
import { resolveCommand, resolveShell } from '@/src/services/batch/resolve';

/**
 * Attach the default "cmd" subcommand action (unified name).
 * Mirrors the prior inline implementation in cmd/index.ts.
 */
export const attachDefaultCmdAction = (
  cli: GetDotenvCliPublic,
  cmd: Command<[string[]]>,
  aliasKey?: string,
) => {
  cmd
    .enablePositionalOptions()
    .passThroughOptions()
    .action(async (commandParts, _opts, thisCommand) => {
      // Commander passes positional tokens as the first action argument
      const args = Array.isArray(commandParts) ? commandParts : [];
      // No-op when invoked as the default command with no args.
      if (args.length === 0) return;

      const merged = readMergedOptions(thisCommand);
      const parent = thisCommand.parent;
      if (!parent) throw new Error('parent command not found');

      // Destructure frequently used flags/options up front
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

      // Conflict detection: if an alias option is present on parent, do not
      // also accept positional cmd args.
      if (aliasKey) {
        const p = parent as CommandUnknownOpts & {
          optsWithGlobals?: () => unknown;
          opts?: () => unknown;
        };
        const pv =
          typeof p.optsWithGlobals === 'function'
            ? p.optsWithGlobals()
            : typeof p.opts === 'function'
              ? p.opts()
              : {};
        const ov = (pv as Record<string, unknown>)[aliasKey];
        if (ov !== undefined) {
          logger.error(`--${aliasKey} option conflicts with cmd subcommand.`);
          process.exit(0);
        }
      }

      // Join positional args into the command string.
      const input = args.map(String).join(' ');

      // Resolve command and shell using shared helpers.
      const resolved = resolveCommand(scriptsCfg, input);

      if (debug) logger.debug('\n*** command ***\n', `'${resolved}'`);

      // Round-trip CLI options for nested getdotenv invocations.
      // Omit logger (functions are not serializable).
      const { logger: _omit, ...envBag } = merged as unknown as Record<
        string,
        unknown
      >;
      const captureFlag =
        process.env.GETDOTENV_STDIO === 'pipe' || Boolean(capture);
      // Prefer explicit env injection using the resolved dotenv map.
      const dotenv = cli.getCtx().dotenv;

      // Diagnostics: --trace [keys...] (space-delimited keys if provided; all keys when true)
      const traceOpt = trace;
      if (traceOpt) {
        // Determine keys to trace: all keys (parent ∪ dotenv) or selected.
        const parentKeys = Object.keys(process.env);
        const dotenvKeys = Object.keys(dotenv);
        const allKeys = Array.from(
          new Set([...parentKeys, ...dotenvKeys]),
        ).sort();
        const keys = Array.isArray(traceOpt) ? traceOpt : allKeys;
        // Child env preview (as composed below; excluding getDotenvCliOptions)
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
          // Apply presentation-time redaction (if enabled)
          const redFlag = redact;
          const redPatternsArr = redactPatterns;
          const redOpts: RedactOptions = {};
          if (redFlag) redOpts.redact = true;
          if (redFlag && Array.isArray(redPatternsArr))
            redOpts.redactPatterns = redPatternsArr;
          const tripleBag: {
            parent?: string;
            dotenv?: string;
            final?: string;
          } = {};
          if (parentVal !== undefined) tripleBag.parent = parentVal;
          if (dot !== undefined) tripleBag.dotenv = dot;
          if (final !== undefined) tripleBag.final = final;
          const triple = redactTriple(k, tripleBag, redOpts);
          // Emit concise diagnostic line to stderr.
          process.stderr.write(
            `[trace] key=${k} origin=${origin} parent=${triple.parent ?? ''} dotenv=${triple.dotenv ?? ''} final=${triple.final ?? ''}\n`,
          );
          // Optional entropy warning (once-per-key)
          const entOpts: EntropyOptions = {};
          if (typeof warnEntropy === 'boolean')
            entOpts.warnEntropy = warnEntropy;
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

      const shellSetting = resolveShell(scriptsCfg, input, shellPref);
      /**
       * Preserve original argv array when:
       * - shell is OFF (plain execa), and
       * - no script alias remap occurred (resolved === input).
       *
       * This avoids lossy re-tokenization of code snippets such as:
       *   node -e "console.log(process.env.APP_SECRET ?? '')"
       * where quotes may have been stripped by the parent shell and
       * spaces inside the code must remain a single argument.
       */
      const commandArg =
        shellSetting === false && resolved === input
          ? maybePreserveNodeEvalArgv(args.map(String))
          : resolved;

      // Serialize nested bag for child env
      let nestedBag: string | undefined;
      try {
        nestedBag = JSON.stringify(envBag);
      } catch {
        nestedBag = undefined;
      }

      await runCommand(commandArg, shellSetting, {
        env: buildSpawnEnv(process.env, {
          ...dotenv,
          ...(nestedBag ? { getDotenvCliOptions: nestedBag } : {}),
        }),
        stdio: captureFlag ? 'pipe' : 'inherit',
      });
    });
};
