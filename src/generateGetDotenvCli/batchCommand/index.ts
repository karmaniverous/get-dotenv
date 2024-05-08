import { Command } from '@commander-js/extra-typings';

import { dotenvExpandFromProcessEnv } from '../../dotenvExpand';
import { GetDotenvCliCommand } from '../types';
import { cmdCommand } from './cmdCommand';
import { execShellCommandBatch } from './execShellCommandBatch';

export const batchCommand = new Command()
  .name('batch')
  .description('Batch shell commands across multiple working directories.')
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
    '-g, --globs <strings...>',
    'space-delimited globs from root path',
    '*',
  )
  .option(
    '-c, --command <string>',
    'shell command string, conflicts with cmd subcommand (dotenv-expanded)',
    dotenvExpandFromProcessEnv,
  )
  .option('-l, --list', 'list working directories without executing command')
  .option('-e, --ignore-errors', 'ignore errors and continue with next path')
  .hook('preSubcommand', async (thisCommand) => {
    if (!thisCommand.parent) throw new Error(`unable to resolve root command`);

    const {
      getDotenvOptions: { logger = console },
    } = thisCommand.parent as GetDotenvCliCommand;

    const { command, ignoreErrors, globs, list, pkgCwd, rootPath } =
      thisCommand.opts();

    if (command && thisCommand.args.length) {
      logger.error(`--command option conflicts with cmd subcommand.`);
      process.exit(0);
    }

    // Execute shell command.
    if (command)
      await execShellCommandBatch({
        command,
        globs,
        ignoreErrors,
        list,
        logger,
        pkgCwd,
        rootPath,
      });
  })
  .addCommand(cmdCommand, { isDefault: true });

export type BatchCommandOptions = ReturnType<typeof batchCommand.opts>;
