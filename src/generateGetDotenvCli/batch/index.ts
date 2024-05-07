import { Command } from '@commander-js/extra-typings';

import { dotenvExpandFromProcessEnv } from '../../dotenvExpand';
import _ from 'lodash';
import { GetDotenvCliCommand } from '../types';
import { Logger } from '../../GetDotenvOptions';
import { globby } from 'globby';
import { execaCommand } from 'execa';
import { packageDirectory } from 'pkg-dir';
import path from 'path';

export const bulk = new Command()
  .name('bulk')
  .description('Bulk commands across local repos.')
  .enablePositionalOptions()
  .passThroughOptions()
  .option(
    '-p, --pkg-cwd',
    'use nearest package directory as current working directory',
  )
  .option(
    '-r, --root-path <string>',
    'path to batch root directory from current working directory (dotenv-expanded)',
    dotenvExpandFromProcessEnv,
    '../',
  )
  .option('-g, --globs <string>', 'space-delimited globs from root path', '*')
  .option('-e, --ignore-errors', 'ignore errors and continue with next path')
  .option(
    '-c, --command <string>',
    'shell command string (dotenv-expanded)',
    dotenvExpandFromProcessEnv,
  )
  .hook('preSubcommand', async (thisCommand) => {
    // Execute shell command.
    const {
      command,
      ignoreErrors,
      globs,
      pkgCwd,
      rootPath = '../',
    } = thisCommand.opts();
    const { logger = console } = (thisCommand.parent as GetDotenvCliCommand)
      .getDotenvOptions;

    if (command)
      await batchCommand({
        command,
        globs,
        ignoreErrors,
        logger,
        pkgCwd,
        rootPath,
      });

    logger.info('');
  })
  .addCommand(
    new Command()
      .name('cmd')
      .description('execute shell command string (default command)')
      .enablePositionalOptions()
      .passThroughOptions()
      .action(async (options, command) => {
        const { ignoreErrors, paths } = command.parent;
        const { logger = console } =
          command.parent?.parent?.getdotenvOptions ?? {};

        const cmd = (command.args ?? []).join(' ');
        if (cmd.length)
          await batchCommand(scripts[cmd] ?? cmd, ignoreErrors, logger, paths);

        console.log('');
      }),
    { isDefault: true },
  )
  .addCommand(list);

const globPaths = async ({
  globs,
  logger,
  pkgCwd,
  rootPath,
}: {
  globs: string;
  logger: Logger;
  pkgCwd: true | undefined;
  rootPath: string;
}) => {
  let cwd = process.cwd();

  if (pkgCwd) {
    const pkgDir = await packageDirectory();

    if (!pkgDir) {
      logger.error('No package directory found.');
      process.exit(0);
    }

    cwd = pkgDir.split(path.sep).join(path.posix.sep);
  }

  const absRootPath = path.posix.resolve(cwd, rootPath);

  const paths = await globby(globs.split(/\s+/), {
    cwd: absRootPath,
    expandDirectories: false,
    onlyDirectories: true,
    absolute: true,
  });

  if (!paths.length) {
    logger.error(`No paths found for globs '${globs}' at '${absRootPath}'.`);
    process.exit(0);
  }

  return paths;
};

const batchCommand = async ({
  command,
  globs,
  ignoreErrors,
  logger,
  pkgCwd,
  rootPath,
}: {
  command: string;
  globs: string;
  ignoreErrors: true | undefined;
  logger: Logger;
  pkgCwd: true | undefined;
  rootPath: string;
}) => {
  const paths = await globPaths({ globs, logger, pkgCwd, rootPath });

  for (const path of paths) {
    // Write path and command to console.
    const pathLabel = `CWD: ${path}`;
    const commandLabel = `CMD: ${command}`;

    logger.info('');
    logger.info('*'.repeat(Math.max(pathLabel.length, commandLabel.length)));
    logger.info(pathLabel);
    logger.info(commandLabel);
    logger.info('');

    // Execute shell command.
    try {
      await execaCommand(command, {
        cwd: path,
        stdio: 'inherit',
        shell: true,
      });
    } catch (error) {
      if (!ignoreErrors) {
        throw error;
      }
    }
  }
};
