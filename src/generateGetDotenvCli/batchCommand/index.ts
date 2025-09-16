import { Command } from 'commander';

import { dotenvExpandFromProcessEnv } from '../../dotenvExpand';
import type { GetDotenvCliCommand } from '../GetDotenvCliGenerateOptions';
import type { GetDotenvCliOptions } from '../GetDotenvCliOptions';
import { resolveCommand, resolveShell } from '../resolve';
import { cmdCommand } from './cmdCommand';
import { execShellCommandBatch } from './execShellCommandBatch';

export const batchCommand = new Command()
  .name('batch')
  .description('Batch command execution across multiple working directories.')
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
  .option('-g, --globs <string>', 'space-delimited globs from root path', '*')
  .option(
    '-c, --command <string>',
    'command executed according to the base --shell option, conflicts with cmd subcommand (dotenv-expanded)',
    dotenvExpandFromProcessEnv,
  )
  .option('-l, --list', 'list working directories without executing command')
  .option('-e, --ignore-errors', 'ignore errors and continue with next path')
  .hook('preSubcommand', async (thisCommand: Command) => {
    if (!thisCommand.parent) throw new Error(`unable to resolve root command`);

    const {
      getDotenvCliOptions: { logger = console, ...getDotenvCliOptions },
    } = thisCommand.parent as GetDotenvCliCommand;

    const raw = thisCommand.opts();
    const commandOpt =
      typeof raw.command === 'string' ? raw.command : undefined;
    const ignoreErrors = !!raw.ignoreErrors;
    const globs = typeof raw.globs === 'string' ? raw.globs : '*';
    const list = !!raw.list;
    const pkgCwd = !!raw.pkgCwd;
    const rootPath = typeof raw.rootPath === 'string' ? raw.rootPath : './';

    const argCount = (thisCommand.args as unknown[]).length;
    if (typeof commandOpt === 'string' && argCount > 0) {
      logger.error(`--command option conflicts with cmd subcommand.`);
      process.exit(0);
    }

    // Execute command.
    if (typeof commandOpt === 'string')
      await execShellCommandBatch({
        command: resolveCommand(getDotenvCliOptions.scripts, commandOpt),
        getDotenvCliOptions,
        globs,
        ignoreErrors,
        list,
        logger,
        pkgCwd,
        rootPath,
        // execa expects string | boolean | URL for `shell`. We normalize earlier;
        // scripts[name].shell overrides take precedence and may be boolean or string.
        shell: resolveShell(
          getDotenvCliOptions.scripts,
          commandOpt,
          getDotenvCliOptions.shell,
        ) as unknown as string | boolean | URL,
      });
  })
  .addCommand(cmdCommand, { isDefault: true });

export type BatchCommandOptions = ReturnType<typeof batchCommand.opts> & {
  getDotenvCliOptions?: GetDotenvCliOptions;
};
