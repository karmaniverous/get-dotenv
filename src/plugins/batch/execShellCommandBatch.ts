import { globby } from 'globby';
import { packageDirectory } from 'package-directory';
import path from 'path';

import {
  buildSpawnEnv,
  composeNestedEnv,
  runCommand,
  runCommandResult,
} from '@/src/cliHost';

import type {
  BatchGlobPathsOptions,
  ExecShellCommandBatchOptions,
} from './types';
import { defaultConcurrency } from './types';

const globPaths = async ({
  globs,
  logger,
  pkgCwd,
  rootPath,
}: BatchGlobPathsOptions) => {
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

/** Result of a single parallel directory execution. */
interface ParallelResult {
  dirPath: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  error?: unknown;
}

/**
 * Execute a batch of commands across multiple directories.
 * Discovers targets via globs/rootPath and runs the command in each.
 */
export const execShellCommandBatch = async ({
  command,
  concurrency,
  getDotenvCliOptions,
  dotenvEnv,
  globs,
  ignoreErrors,
  list,
  logger,
  parallel,
  pkgCwd,
  rootPath,
  shell,
}: ExecShellCommandBatchOptions) => {
  const capture =
    process.env.GETDOTENV_STDIO === 'pipe' ||
    Boolean(
      (getDotenvCliOptions as { capture?: boolean } | undefined)?.capture,
    );

  // Require a command only when not listing. In list mode, a command is optional.
  if (!command && !list) {
    logger.error(`No command provided. Use --command or --list.`);
    process.exit(0);
  }
  const { absRootPath, paths } = await globPaths({
    globs,
    logger: logger,
    rootPath,
    // exactOptionalPropertyTypes: only include when defined
    ...(pkgCwd !== undefined ? { pkgCwd } : {}),
  });

  const headerTitle = list
    ? 'Listing working directories...'
    : parallel
      ? 'Executing command batch (parallel)...'
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

  // List mode: no parallelism needed.
  if (list) {
    for (const p of paths) {
      logger.info(`CWD:   ${p}`);
    }
    logger.info('');
    return;
  }

  // Narrow command to a non-empty string or array after validation.
  const validCommand: string | string[] | undefined =
    typeof command === 'string' && command.length > 0
      ? command
      : Array.isArray(command) && command.length > 0
        ? command
        : undefined;

  if (!validCommand) {
    logger.error(`No command provided. Use --command or --list.`);
    process.exit(0);
  }

  // Compose child env overlay once (shared across all paths).
  const overlay = composeNestedEnv(getDotenvCliOptions ?? {}, dotenvEnv ?? {});
  const spawnEnv = buildSpawnEnv(process.env, overlay);

  if (parallel) {
    // Parallel execution with concurrency-limited pool.
    const limit = concurrency ?? defaultConcurrency;
    const results: ParallelResult[] = [];

    // Simple semaphore-based concurrency pool.
    let active = 0;
    let nextIdx = 0;
    const total = paths.length;
    results.length = total;

    await new Promise<void>((resolveAll, rejectAll) => {
      let settled = false;
      let completedCount = 0;

      const tryLaunch = () => {
        while (active < limit && nextIdx < total) {
          const idx = nextIdx++;
          const dirPath = paths[idx] as string;
          active++;

          runCommandResult(validCommand, shell, {
            cwd: dirPath,
            env: spawnEnv,
          })
            .then((res) => {
              results[idx] = {
                dirPath,
                exitCode: res.exitCode,
                stdout: res.stdout,
                stderr: res.stderr,
              };
            })
            .catch((err: unknown) => {
              results[idx] = {
                dirPath,
                exitCode: 1,
                stdout: '',
                stderr: String(err),
                error: err,
              };
            })
            .finally(() => {
              active--;
              completedCount++;
              if (completedCount === total && !settled) {
                settled = true;
                resolveAll();
              } else {
                tryLaunch();
              }
            });
        }
      };

      if (total === 0) {
        resolveAll();
      } else {
        tryLaunch();
      }

      // Safety: if rejectAll is never called, the promise resolves via completedCount.
      void rejectAll;
    });

    // Print results in discovery order.
    const failures: ParallelResult[] = [];

    for (const result of results) {
      const pathLabel = `CWD:   ${result.dirPath}`;
      logger.info('');
      logger.info('*'.repeat(pathLabel.length));
      logger.info(pathLabel);
      logger.info(headerCommand);

      if (result.stdout) {
        process.stdout.write(
          result.stdout + (result.stdout.endsWith('\n') ? '' : '\n'),
        );
      }
      if (result.stderr) {
        process.stderr.write(
          result.stderr + (result.stderr.endsWith('\n') ? '' : '\n'),
        );
      }

      if (result.exitCode !== 0) {
        failures.push(result);
      }
    }

    if (failures.length > 0 && !ignoreErrors) {
      logger.error('');
      logger.error(
        `${String(failures.length)} of ${String(total)} directories failed:`,
      );
      for (const f of failures) {
        logger.error(`  ${f.dirPath} (exit code ${String(f.exitCode)})`);
      }
    }
  } else {
    // Sequential execution (original behavior).
    for (const p of paths) {
      const pathLabel = `CWD:   ${p}`;
      logger.info('');
      logger.info('*'.repeat(pathLabel.length));
      logger.info(pathLabel);
      logger.info(headerCommand);

      try {
        await runCommand(validCommand, shell, {
          cwd: p,
          env: spawnEnv,
          stdio: capture ? 'pipe' : 'inherit',
        });
      } catch (error) {
        if (!ignoreErrors) {
          throw error;
        }
      }
    }
  }

  logger.info('');
};
