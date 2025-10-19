import { Command } from 'commander';

import { runCommand } from '../../cliCore/exec';
import { buildSpawnEnv } from '../../cliCore/spawnEnv';
import type { CommandWithOptions } from '../../cliCore/types';
import { definePlugin } from '../../cliHost/definePlugin';
import type { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import type { EntropyOptions } from '../../diagnostics/entropy';
import { maybeWarnEntropy } from '../../diagnostics/entropy';
import { redactTriple } from '../../diagnostics/redact';
import type { GetDotenvCliOptions } from '../../generateGetDotenvCli/GetDotenvCliOptions';
import type { Logger } from '../../GetDotenvOptions';
import { resolveCommand, resolveShell } from '../../services/batch/resolve';
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

/**+ Cmd plugin: executes a command using the current getdotenv CLI context.
 *
 * - Joins positional args into a single command string.
 * - Resolves scripts and shell settings using shared helpers.
 * - Forwards merged CLI options to subprocesses via
 *   process.env.getDotenvCliOptions for nested CLI behavior. */
export const cmdPlugin = (options: CmdPluginOptions = {}) =>
  definePlugin({
    id: 'cmd',
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
      const cmd = new Command()
        .name('cmd')
        .description(
          'Batch execute command according to the --shell option, conflicts with --command option (default subcommand)',
        )
        .configureHelp({ showGlobalOptions: true })
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
                const merged =
                  (
                    parent as unknown as {
                      getDotenvCliOptions?: Record<string, unknown>;
                    }
                  ).getDotenvCliOptions ?? {};
                const logger: Logger =
                  (merged as { logger?: Logger }).logger ?? console;
                const lr = logger as unknown as {
                  error?: (...a: unknown[]) => void;
                  log: (...a: unknown[]) => void;
                };
                const emit = lr.error ?? lr.log;
                emit(`--${aliasKey} option conflicts with cmd subcommand.`);
                process.exit(0);
              }
            }

            // Merged CLI options are persisted by the shipped CLI preSubcommand hook.
            const merged =
              (
                parent as unknown as {
                  getDotenvCliOptions?: Record<string, unknown>;
                }
              ).getDotenvCliOptions ?? {};
            const logger: Logger =
              (merged as { logger?: Logger }).logger ?? console;
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

            if ((merged as { debug?: boolean }).debug) {
              const lg = logger as unknown as {
                debug?: (...a: unknown[]) => void;
                log: (...a: unknown[]) => void;
              };
              (lg.debug ?? lg.log)('\n*** command ***\n', `'${resolved}'`);
            }

            // Round-trip CLI options for nested getdotenv invocations.
            // Omit logger (functions are not serializable).
            const { logger: _omit, ...envBag } = merged as unknown as Record<
              string,
              unknown
            >;
            const capture =
              process.env.GETDOTENV_STDIO === 'pipe' ||
              Boolean((merged as { capture?: boolean }).capture);
            // Prefer explicit env injection: pass the resolved dotenv map to the child.
            // This avoids leaking prior secrets from the parent process.env when
            // exclusions (e.g., --exclude-private) are in effect.
            const host = cli as unknown as GetDotenvCli;
            const ctx = host.getCtx();
            const dotenv = (ctx?.dotenv ?? {}) as Record<
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
                const redFlag = (merged as { redact?: boolean }).redact;
                const redPatterns = (merged as { redactPatterns?: string[] })
                  .redactPatterns;
                const redOpts: { redact?: boolean; redactPatterns?: string[] } =
                  {};
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
                    entropyWhitelist?: string[];
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
            const shellSetting = resolveShell(
              scripts,
              input,
              shell,
            ) as unknown as string | boolean | URL;
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
              } as Record<
                string,
                string | undefined
              >) as unknown as NodeJS.ProcessEnv,
              stdio: capture ? 'pipe' : 'inherit',
            });
          },
        );
      if (options.asDefault) cli.addCommand(cmd, { isDefault: true });
      else cli.addCommand(cmd);

      // Parent-attached option alias (optional).
      if (aliasSpec)
        attachParentAlias(cli as unknown as GetDotenvCli, options, cmd);
    },
  });
