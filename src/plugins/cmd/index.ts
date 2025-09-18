import { Command } from 'commander';
import { execa, execaCommand } from 'execa';

import { baseRootOptionDefaults } from '../../cliCore/defaults';
import { resolveCliOptions } from '../../cliCore/resolveCliOptions';
import type { CommandWithOptions } from '../../cliCore/types';
import { definePlugin } from '../../cliHost/definePlugin';
import type { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import { dotenvExpandFromProcessEnv } from '../../dotenvExpand';
import type { GetDotenvCliOptions } from '../../generateGetDotenvCli/GetDotenvCliOptions';
import type { Logger } from '../../GetDotenvOptions';
import { getDotenvCliOptions2Options } from '../../GetDotenvOptions';
import { resolveCommand, resolveShell } from '../../services/batch/resolve';

export type CmdPluginOptions = {
  /**
   * When true, register as the default subcommand at the root.
   */
  asDefault?: boolean;
  /**
   * Optional alias option attached to the parent command to invoke the cmd   * behavior without specifying the subcommand explicitly.
   */
  optionAlias?:
    | string
    | { flags: string; description?: string; expand?: boolean };
};

// Minimal tokenizer for shell-off execution:
// Splits by whitespace while preserving quoted segments (single or double quotes).
const tokenize = (command: string): string[] => {
  const out: string[] = [];
  let cur = '';
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < command.length; i++) {
    const c = command.charAt(i);
    if (quote) {
      if (c === quote) quote = null;
      else cur += c;
    } else {
      if (c === '"' || c === "'") quote = c;
      else if (/\s/.test(c)) {
        if (cur) {
          out.push(cur);
          cur = '';
        }
      } else cur += c;
    }
  }
  if (cur) out.push(cur);
  return out;
};
const runCommand = async (
  command: string,
  shell: string | boolean | URL,
  opts: { env?: NodeJS.ProcessEnv; stdio?: 'inherit' | 'pipe' },
): Promise<number> => {
  if (shell === false) {
    const tokens = tokenize(command);
    const file = tokens[0];
    if (!file) return 0;
    const result = await execa(file, tokens.slice(1), { ...opts });
    if (opts.stdio === 'pipe' && result.stdout) {
      process.stdout.write(
        result.stdout + (result.stdout.endsWith('\n') ? '' : '\n'),
      );
    }
    // In unit tests, execa may be mocked to return a void/undefined result.
    // Read exitCode defensively; return NaN to signal "mocked/no real exit code".
    const exit = (result as { exitCode?: unknown }).exitCode;
    return typeof exit === 'number' ? exit : Number.NaN;
  } else {
    const result = await execaCommand(command, { shell, ...opts });
    if (opts.stdio === 'pipe' && result.stdout) {
      process.stdout.write(
        result.stdout + (result.stdout.endsWith('\n') ? '' : '\n'),
      );
    }
    const exit = (result as { exitCode?: unknown }).exitCode;
    return typeof exit === 'number' ? exit : Number.NaN;
  }
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
            await runCommand(
              resolved,
              resolveShell(scripts, input, shell) as unknown as
                | string
                | boolean
                | URL,
              {
                env: {
                  ...process.env,
                  getDotenvCliOptions: JSON.stringify(envBag),
                },
                stdio: capture ? 'pipe' : 'inherit',
              },
            );
          },
        );
      if (options.asDefault) cli.addCommand(cmd, { isDefault: true });
      else cli.addCommand(cmd);

      // Parent-attached option alias (optional).
      if (aliasSpec) {
        // Attach option to the parent (cli) with optional description.
        const desc =
          aliasSpec.description ??
          'alias of cmd subcommand; provide command tokens (variadic)';
        cli.option(aliasSpec.flags, desc);

        // Parent preAction: execute alias when no subcommand is invoked.
        cli.hook(
          'preAction',
          async (thisCommand: CommandWithOptions<GetDotenvCliOptions>) => {
            // Determine if any known subcommand is present in raw argv.
            const raw =
              (thisCommand as unknown as { rawArgs?: string[] }).rawArgs ?? [];
            const childNames = thisCommand.commands.flatMap((c) => [
              c.name(),
              ...c.aliases(),
            ]);
            const hasSub = childNames.some((n) => raw.includes(n));

            // Read alias value from parent opts.
            const o = thisCommand.opts();
            const val = aliasKey
              ? (o as unknown as Record<string, unknown>)[aliasKey]
              : undefined;
            const provided =
              typeof val === 'string'
                ? val.length > 0
                : Array.isArray(val)
                  ? val.length > 0
                  : false;

            if (!provided) return; // alias not present
            // If a subcommand is specified, ignore alias here. The cmd action will
            // handle conflict if the subcommand is 'cmd'.
            if (hasSub) return;

            // Merge CLI options and resolve dotenv context (independent of passOptions order).
            const { merged } = resolveCliOptions<GetDotenvCliOptions>(
              o as unknown,
              baseRootOptionDefaults as Partial<GetDotenvCliOptions>,
              process.env.getDotenvCliOptions,
            );
            const logger: Logger =
              (merged as { logger?: Logger }).logger ?? console;
            // Ensure context computed before executing.
            const serviceOptions = getDotenvCliOptions2Options(merged);
            await (cli as unknown as GetDotenvCli).resolveAndLoad(
              serviceOptions,
            );

            // Normalize alias value: join variadic into a single string.
            const joined =
              typeof val === 'string'
                ? val
                : Array.isArray(val)
                  ? (val as unknown[]).map(String).join(' ')
                  : '';
            const input =
              aliasSpec.expand === false
                ? joined
                : (dotenvExpandFromProcessEnv(joined) ?? joined);

            const resolved = resolveCommand(merged.scripts, input);
            const lg = logger as unknown as {
              debug?: (...a: unknown[]) => void;
              log: (...a: unknown[]) => void;
            };
            if ((merged as { debug?: boolean }).debug) {
              (lg.debug ?? lg.log)('\n*** command ***\n', `'${resolved}'`);
            }
            const { logger: _omit, ...envBag } = merged as unknown as Record<
              string,
              unknown
            >;
            const capture =
              process.env.GETDOTENV_STDIO === 'pipe' ||
              Boolean((merged as unknown as { capture?: boolean }).capture);
            const exitCode = await runCommand(
              resolved,
              resolveShell(merged.scripts, input, merged.shell) as unknown as
                | string
                | boolean
                | URL,
              {
                env: {
                  ...process.env,
                  getDotenvCliOptions: JSON.stringify(envBag),
                },
                stdio: capture ? 'pipe' : 'inherit',
              },
            );
            // Exit deterministically for real CLI runs; skip when mocked (NaN).
            if (!Number.isNaN(exitCode)) {
              // Propagate child exit code for CI/automation parity.

              process.exit(exitCode);
            }
          },
        );
      }
    },
  });
