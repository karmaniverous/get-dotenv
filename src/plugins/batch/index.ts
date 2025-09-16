import { definePlugin } from '../../cliHost/definePlugin';
import type { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import { execShellCommandBatch } from '../../generateGetDotenvCli/batchCommand/execShellCommandBatch';
import type { Scripts } from '../../generateGetDotenvCli/GetDotenvCliOptions';
import {
  resolveCommand,
  resolveShell,
} from '../../generateGetDotenvCli/resolve';
import type { Logger } from '../../GetDotenvOptions';

export type BatchPluginOptions = {
  scripts?: Scripts;
  shell?: string | boolean;
  logger?: Logger;
};

/**
 * Batch plugin for the GetDotenv CLI host.
 *
 * Mirrors the legacy batch subcommand behavior without altering the shipped CLI.
 * Options:
 * - scripts/shell: used to resolve command and shell behavior per script or global default.
 * - logger: defaults to console.
 */
export const batchPlugin = (opts: BatchPluginOptions = {}) =>
  definePlugin({
    id: 'batch',
    setup(cli: GetDotenvCli) {
      const logger = opts.logger ?? console;
      const ns = cli.ns('batch');

      ns.description(
        'Batch command execution across multiple working directories.',
      )
        .enablePositionalOptions()
        .passThroughOptions()
        .option(
          '-p, --pkg-cwd',
          'use nearest package directory as current working directory',
        )
        .option(
          '-r, --root-path <string>',
          'path to batch root directory from current working directory',
          './',
        )
        .option(
          '-g, --globs <string>',
          'space-delimited globs from root path',
          '*',
        )
        .option(
          '-c, --command <string>',
          'command executed according to the base shell resolution',
        )
        .option(
          '-l, --list',
          'list working directories without executing command',
        )
        .option(
          '-e, --ignore-errors',
          'ignore errors and continue with next path',
        )
        .hook('preSubcommand', async (thisCommand) => {
          // Ensure context exists (host preSubcommand will create if missing).
          const ctx = cli.getCtx();
          void ctx; // reserved for future use (dotenv/process merge already handled by host)

          const raw = (
            thisCommand as unknown as {
              opts: () => Record<string, unknown>;
            }
          ).opts();
          const commandOpt =
            typeof raw.command === 'string' ? raw.command : undefined;
          const ignoreErrors = !!raw.ignoreErrors;
          const globs = typeof raw.globs === 'string' ? raw.globs : '*';
          const list = !!raw.list;
          const pkgCwd = !!raw.pkgCwd;
          const rootPath =
            typeof raw.rootPath === 'string' ? raw.rootPath : './';

          if (!commandOpt && !list) {
            logger.error(`No command provided. Use --command or --list.`);
            process.exit(0);
          }

          if (typeof commandOpt === 'string') {
            await execShellCommandBatch({
              command: resolveCommand(opts.scripts, commandOpt),
              globs,
              ignoreErrors,
              list,
              logger,
              ...(pkgCwd ? { pkgCwd } : {}),
              rootPath,
              shell: resolveShell(
                opts.scripts,
                commandOpt,
                opts.shell,
              ) as unknown as string | boolean | URL,
            });
          } else {
            // list only
            await execShellCommandBatch({
              globs,
              ignoreErrors,
              list: true,
              logger,
              ...(pkgCwd ? { pkgCwd } : {}),
              rootPath,
              shell: (opts.shell === undefined
                ? false
                : opts.shell) as unknown as string | boolean | URL,
            });
          }
        });
    },
  });
