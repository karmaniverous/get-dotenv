import { execaCommand } from 'execa';
import { globby } from 'globby';
import path from 'path';
import { packageDirectory } from 'pkg-dir';

import { Logger } from '../../GetDotenvOptions';
import { BatchCommandOptions } from '.';

type ExecShellCommandBatchOptions = BatchCommandOptions & { logger: Logger };

const globPaths = async ({
  globs,
  logger,
  pkgCwd,
  rootPath,
}: ExecShellCommandBatchOptions) => {
  let cwd = process.cwd();

  if (pkgCwd) {
    const pkgDir = await packageDirectory();

    if (!pkgDir) {
      logger.error('No package directory found.');
      process.exit(0);
    }

    cwd = pkgDir;
  }

  const absRootPath = path.posix.join(
    cwd.split(path.sep).join(path.posix.sep),
    rootPath.split(path.sep).join(path.posix.sep),
  );

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

  return { absRootPath, paths };
};

export const execShellCommandBatch = async ({
  command,
  getDotenvCliOptions,
  globs,
  ignoreErrors,
  list,
  logger,
  pkgCwd,
  rootPath,
  shell,
}: BatchCommandOptions & {
  logger: Logger;
  shell: string | boolean | undefined;
}) => {
  if (!command) {
    logger.error(`No command provided.`);
    process.exit(0);
  }

  const { absRootPath, paths } = await globPaths({
    globs,
    logger,
    pkgCwd,
    rootPath,
  });

  const headerTitle = list
    ? 'Listing working directories...'
    : 'Executing command batch...';
  logger.info('');
  const headerRootPath = `ROOT:  ${absRootPath}`;
  const headerGlobs = `GLOBS: ${globs}`;
  const headerCommand = `CMD:   ${command}`;

  logger.info(
    '*'.repeat(
      Math.max(
        headerTitle.length,
        headerRootPath.length,
        headerGlobs.length,
        headerCommand.length,
      ),
    ),
  );
  logger.info(headerTitle);
  logger.info('');
  logger.info(headerRootPath);
  logger.info(headerGlobs);
  logger.info(headerCommand);

  for (const path of paths) {
    // Write path and command to console.
    const pathLabel = `CWD:   ${path}`;

    if (list) {
      logger.info(pathLabel);
      continue;
    }

    logger.info('');
    logger.info('*'.repeat(pathLabel.length));
    logger.info(pathLabel);
    logger.info(headerCommand);

    // Execute command.
    try {
      await execaCommand(command, {
        cwd: path,
        env: {
          getDotenvCliOptions: getDotenvCliOptions
            ? JSON.stringify(getDotenvCliOptions)
            : undefined,
        },
        stdio: 'inherit',
        shell,
      });
    } catch (error) {
      if (!ignoreErrors) {
        throw error;
      }
    }
  }

  logger.info('');
};
