import { Command } from 'commander';
import { execaCommand } from 'execa';

import { definePlugin } from '../../cliHost/definePlugin';
import type { Logger } from '../../GetDotenvOptions';
import { resolveCommand, resolveShell } from '../../services/batch/resolve';

export type CmdPluginOptions = {
  /**
   * When true, register as the default subcommand at the root.
   */
  asDefault?: boolean;
};

/**
+ Cmd plugin: executes a command using the current getdotenv CLI context.
 *
 * - Joins positional args into a single command string.
 * - Resolves scripts and shell settings using shared helpers.
 * - Forwards merged CLI options to subprocesses via
 *   process.env.getDotenvCliOptions for nested CLI behavior.
 */
export const cmdPlugin = (options: CmdPluginOptions = {}) =>
  definePlugin({
    id: 'cmd',
    setup(cli) {
      const cmd = new Command()
        .name('cmd')
        .description(
          'Batch execute command according to the --shell option, conflicts with --command option (default subcommand)',
        )
        .configureHelp({ showGlobalOptions: true })
        .enablePositionalOptions()
        .passThroughOptions()
        .action(async (_opts: unknown, thisCommand: Command) => {
          const args = (thisCommand.args ?? []) as unknown[];
          // No-op when invoked as the default command with no args.
          if (args.length === 0) return;

          const parent = thisCommand.parent;
          if (!parent) throw new Error('parent command not found');

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
          const { logger: _omit, ...envBag } = merged;

          await execaCommand(resolved, {
            env: {
              ...process.env,
              getDotenvCliOptions: JSON.stringify(envBag),
            },
            shell: resolveShell(scripts, input, shell) as unknown as
              | string
              | boolean
              | URL,
            stdio: 'inherit',
          });
        });

      if (options.asDefault) cli.addCommand(cmd, { isDefault: true });
      else cli.addCommand(cmd);
    },
  });
