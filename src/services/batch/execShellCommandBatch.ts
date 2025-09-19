import { execa, execaCommand } from 'execa';
import { globby } from 'globby';
import { packageDirectory } from 'package-directory';
import path from 'path';

import type { Logger } from '../../GetDotenvOptions';
type ExecShellCommandBatchOptions = {
  globs: string;
  logger: Logger;
  pkgCwd?: boolean;
  rootPath: string;
};

// Tokenize a shell-free command string into argv tokens (preserve quoted segments).
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
  command: string | string[],
  shell: string | boolean | URL,
  opts: { cwd: string; env: NodeJS.ProcessEnv; stdio: 'inherit' | 'pipe' },
) => {
  if (shell === false) {
    let file: string | undefined;
    let args: string[] = [];
    if (Array.isArray(command)) {
      file = command[0];
      args = command.slice(1);
    } else {
      const tokens = tokenize(command);
      file = tokens[0];
      args = tokens.slice(1);
    }
    if (!file) return;
    const result = await execa(file, args, opts);
    if (opts.stdio === 'pipe' && result.stdout) {
      process.stdout.write(
        result.stdout + (result.stdout.endsWith('\n') ? '' : '\n'),
      );
    }
  } else {
    // execaCommand expects a string; coerce array by joining with spaces.
    const cmdStr = Array.isArray(command) ? command.join(' ') : command;
    const result = await execaCommand(cmdStr, { shell, ...opts });
    if (opts.stdio === 'pipe' && result.stdout) {
      process.stdout.write(
        result.stdout + (result.stdout.endsWith('\n') ? '' : '\n'),
      );
    }
  }
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
  command?: string | string[];
  getDotenvCliOptions?: Record<string, unknown>;
  globs: string;
  ignoreErrors?: boolean;
  list?: boolean;
  logger: Logger;
  pkgCwd?: boolean;
  rootPath: string;
  shell: string | boolean | URL;
}) => {
  const capture =
    process.env.GETDOTENV_STDIO === 'pipe' ||
    Boolean(
      (getDotenvCliOptions as { capture?: boolean } | undefined)?.capture,
    ); // Require a command only when not listing. In list mode, a command is optional.
  if (!command && !list) {
    logger.error(`No command provided. Use --command or --list.`);
    process.exit(0);
  }
  const { absRootPath, paths } = await globPaths({
    globs,
    logger,
    rootPath,
    // exactOptionalPropertyTypes: only include when defined
    ...(pkgCwd !== undefined ? { pkgCwd } : {}),
  });

  const headerTitle = list
    ? 'Listing working directories...'
    : 'Executing command batch...';
  logger.info('');
  const headerRootPath = `ROOT:  ${absRootPath}`;
  const headerGlobs = `GLOBS: ${globs}`;
  // Prepare a safe label for the header (avoid undefined in template)
  const commandLabel = Array.isArray(command)
    ? command.join(' ')
    : typeof command === 'string' && command.length > 0
      ? command
      : '';
  const headerCommand = list ? `CMD:   (list only)` : `CMD:   ${commandLabel}`;

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
      const hasCmd =
        (typeof command === 'string' && command.length > 0) ||
        (Array.isArray(command) && command.length > 0);
      if (hasCmd) {
        await runCommand(command, shell, {
          cwd: path,
          env: {
            ...process.env,
            getDotenvCliOptions: getDotenvCliOptions
              ? JSON.stringify(getDotenvCliOptions)
              : undefined,
          },
          stdio: capture ? 'pipe' : 'inherit',
        });
      } else {
        // Should not occur due to the early guard; retain for type safety.
        logger.error(`No command provided. Use --command or --list.`);
        process.exit(0);
      }
    } catch (error) {
      if (!ignoreErrors) {
        throw error;
      }
    }
  }

  logger.info('');
};
