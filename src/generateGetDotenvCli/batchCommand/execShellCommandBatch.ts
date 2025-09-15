import { execaCommand } from 'execa';
import { globby } from 'globby';
import { packageDirectory } from 'package-directory';
import path from 'path';

import type { Logger } from '../../GetDotenvOptions';
import type { GetDotenvCliOptions } from '../GetDotenvCliOptions';

type ExecShellCommandBatchOptions = {
  globs: string;
  logger: Logger;
  pkgCwd?: boolean;
  rootPath: string;
};

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
}: {
  command?: string;
  getDotenvCliOptions?: GetDotenvCliOptions;
  globs: string;
  ignoreErrors?: boolean;
  list?: boolean;
  logger: Logger;
  pkgCwd?: boolean;
  rootPath: string;
  shell: string | boolean | URL;
}) => {
  if (!command) {
    logger.error(`No command provided.`);
    process.exit(0);
  }

  const { absRootPath, paths } = await globPaths({
    globs,
    logger,
    rootPath,
    // exactOptionalPropertyTypes: only include when defined; coerce to boolean
    ...(pkgCwd !== undefined ? { pkgCwd: !!pkgCwd } : {}),
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
          ...process.env,
          getDotenvCliOptions: getDotenvCliOptions
            ? JSON.stringify(getDotenvCliOptions)
            : undefined,
        },
        stdio: 'inherit',
        shell, // already normalized to string | boolean | URL
      });
    } catch (error) {
      if (!ignoreErrors) {
        throw error;
      }
    }
  }

  logger.info('');
};
