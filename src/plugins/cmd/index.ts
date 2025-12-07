import type { Command } from 'commander';
import { z } from 'zod';

import { definePlugin } from '@/src/cliHost/definePlugin';
import { runCommand } from '@/src/cliHost/exec';
import type { GetDotenvCliOptions } from '@/src/cliHost/GetDotenvCliOptions';
import { readMergedOptions } from '@/src/cliHost/readMergedOptions';
import { buildSpawnEnv } from '@/src/cliHost/spawnEnv';
import type { CommandWithOptions } from '@/src/cliHost/types';
import type { EntropyOptions } from '@/src/diagnostics/entropy';
import { maybeWarnEntropy } from '@/src/diagnostics/entropy';
import type { RedactOptions } from '@/src/diagnostics/redact';
import { redactTriple } from '@/src/diagnostics/redact';
import { resolveCommand, resolveShell } from '@/src/services/batch/resolve';

import { attachParentAlias } from './alias';
export type CmdPluginOptions = {
  /**
   * When true, register as the default subcommand at the root.   */
  asDefault?: boolean;
  /**
   * Optional alias option attached to the parent command to invoke the cmd   * behavior without specifying the subcommand explicitly.
   */
  optionAlias?:
    | string
    | { flags: string; description?: string; expand?: boolean };
};

// Plugin config (Zod): currently a single optional flag to control alias expansion default.
export const CmdConfigSchema = z
  .object({
    expand: z.boolean().optional(),
  })
  .strict();
export type CmdConfig = z.infer<typeof CmdConfigSchema>;

/**+ Cmd plugin: executes a command using the current getdotenv CLI context.
 *
 * - Joins positional args into a single command string.
 * - Resolves scripts and shell settings using shared helpers.
 * - Forwards merged CLI options to subprocesses via
 *   process.env.getDotenvCliOptions for nested CLI behavior. */
export const cmdPlugin = (options: CmdPluginOptions = {}) =>
  definePlugin({
    id: 'cmd',
    configSchema: CmdConfigSchema,
    setup(cli) {
      const aliasSpec =
        typeof options.optionAlias === 'string'
          ? { flags: options.optionAlias, description: undefined, expand: true }
          : options.optionAlias;
      const deriveKey = (flags: string) => {
        const long =
          flags.split(/[ ,|]+/).find((f) => f.startsWith('--')) ?? '--cmd';
        const name = long.replace(/^--/, '');
        return name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
      };
      const aliasKey = aliasSpec ? deriveKey(aliasSpec.flags) : undefined;
      // Create as a GetDotenvCli child so helpInformation includes a trailing blank line.
      const cmd = cli
        .createCommand('cmd')
        .description(
          'Execute command according to the --shell option, conflicts with --command option (default subcommand)',
        )
        .enablePositionalOptions()
        .passThroughOptions()
        .argument('[command...]')
        .action(
          async (
            commandParts: string[] | undefined,
            _opts: unknown,
            thisCommand: CommandWithOptions<GetDotenvCliOptions>,
          ) => {
            // Commander passes positional tokens as the first action argument
            const args = Array.isArray(commandParts) ? commandParts : [];
            // No-op when invoked as the default command with no args.
            if (args.length === 0) return;
            // Access merged root options via helper (root ascension inside)
            const merged = readMergedOptions(thisCommand);
            const parent = thisCommand.parent as
              | (CommandWithOptions<GetDotenvCliOptions> & Command)
              | null;
            if (!parent) throw new Error('parent command not found'); // Conflict detection: if an alias option is present on parent, do not
            // also accept positional cmd args.
            if (aliasKey) {
              const pv = (
                parent as CommandWithOptions<GetDotenvCliOptions>
              ).opts();
              const ov = (pv as unknown as Record<string, unknown>)[aliasKey];
              if (ov !== undefined) {
                const logger = merged.logger;
                logger.error(
                  `--${aliasKey} option conflicts with cmd subcommand.`,
                );
                process.exit(0);
              }
            }

            const logger = merged.logger;
            // Join positional args into the command string.
            const input = args.map(String).join(' ');

            // Resolve command and shell using shared helpers.
            const scripts = (
              merged as {
                scripts?: Record<
                  string,
                  string | { cmd: string; shell?: string | boolean }
                >;
              }
            ).scripts;
            const shell = (merged as { shell?: string | boolean }).shell;
            const resolved = resolveCommand(scripts, input);

            if ((merged as { debug?: boolean }).debug)
              logger.debug('\n*** command ***\n', `'${resolved}'`);

            // Round-trip CLI options for nested getdotenv invocations.
            // Omit logger (functions are not serializable).
            const { logger: _omit, ...envBag } = merged;
            const capture =
              process.env.GETDOTENV_STDIO === 'pipe' ||
              Boolean((merged as { capture?: boolean }).capture);
            // Prefer explicit env injection using the resolved dotenv map.
            const dotenv = cli.getCtx().dotenv as Record<
              string,
              string | undefined
            >;
            // Diagnostics: --trace [keys...] (space-delimited keys if provided; all keys when true)
            const traceOpt = (merged as { trace?: boolean | string[] }).trace;
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
                const parent = process.env[k];
                const dot = dotenv[k];
                const final = childEnvPreview[k];
                const origin =
                  dot !== undefined
                    ? 'dotenv'
                    : parent !== undefined
                      ? 'parent'
                      : 'unset';
                // Apply presentation-time redaction (if enabled)
                const redFlag = merged.redact;
                const redPatterns = merged.redactPatterns;
                const redOpts: RedactOptions = {};
                if (redFlag) redOpts.redact = true;
                if (redFlag && Array.isArray(redPatterns))
                  redOpts.redactPatterns = redPatterns;
                const tripleBag: {
                  parent?: string;
                  dotenv?: string;
                  final?: string;
                } = {};
                if (parent !== undefined) tripleBag.parent = parent;
                if (dot !== undefined) tripleBag.dotenv = dot;
                if (final !== undefined) tripleBag.final = final;
                const triple = redactTriple(k, tripleBag, redOpts);
                // Emit concise diagnostic line to stderr.
                process.stderr.write(
                  `[trace] key=${k} origin=${origin} parent=${triple.parent ?? ''} dotenv=${triple.dotenv ?? ''} final=${triple.final ?? ''}\n`,
                );
                // Optional entropy warning (once-per-key)
                const entOpts: EntropyOptions = {};
                const warnEntropy = (merged as { warnEntropy?: boolean })
                  .warnEntropy;
                const entropyThreshold = (
                  merged as {
                    entropyThreshold?: number;
                  }
                ).entropyThreshold;
                const entropyMinLength = (
                  merged as {
                    entropyMinLength?: number;
                  }
                ).entropyMinLength;
                const entropyWhitelist = (
                  merged as {
                    entropyWhitelist?: Array<string | RegExp>;
                  }
                ).entropyWhitelist;
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
            const shellSetting = resolveShell(scripts, input, shell);
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
                ? args.map(String)
                : resolved;
            await runCommand(commandArg, shellSetting, {
              env: buildSpawnEnv(process.env, {
                ...dotenv,
                getDotenvCliOptions: JSON.stringify(envBag),
              }),
              stdio: capture ? 'pipe' : 'inherit',
            });
          },
        );
      if (options.asDefault) cli.addCommand(cmd, { isDefault: true });
      else cli.addCommand(cmd);

      // Parent-attached option alias (optional).
      if (aliasSpec)
        attachParentAlias(
          cli,
          options,
          cmd,
          /* plugin */ this as unknown as ReturnType<typeof definePlugin>,
        );
    },
  });
