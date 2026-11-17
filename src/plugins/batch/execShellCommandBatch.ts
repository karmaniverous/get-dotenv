import { globby } from 'globby';
import { packageDirectory } from 'package-directory';
import path from 'path';

import {
  buildSpawnEnv,
  composeNestedEnv,
  runCommand,
  runCommandResult,
} from '@/src/cliHost';
import { shouldCapture } from '@/src/cliHost/exec';

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
      process.exit(1);
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
    process.exit(1);
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

type BatchLogger = ExecShellCommandBatchOptions['logger'];

/** What every directory run needs: the command, its shell and the child env. */
interface DirectoryRun {
  command: string | string[];
  shell: ExecShellCommandBatchOptions['shell'];
  env: ReturnType<typeof buildSpawnEnv>;
  headerCommand: string;
  ignoreErrors: boolean | undefined;
  logger: BatchLogger;
}

/** Log the batch header: a rule as wide as its widest line, then the lines. */
const logBatchHeader = (logger: BatchLogger, lines: string[]): void => {
  const [title = '', ...rest] = lines;
  logger.info('*'.repeat(Math.max(...lines.map((line) => line.length))));
  logger.info(title);
  logger.info('');
  for (const line of rest) logger.info(line);
};

/** Log the header of one directory's run. */
const logDirectoryHeader = (
  logger: BatchLogger,
  dirPath: string,
  headerCommand: string,
): void => {
  const pathLabel = `CWD:   ${dirPath}`;
  logger.info('');
  logger.info('*'.repeat(pathLabel.length));
  logger.info(pathLabel);
  logger.info(headerCommand);
};

/** Write captured output, ending it with a newline. */
const writeCaptured = (stream: NodeJS.WriteStream, text: string): void => {
  if (text) stream.write(text + (text.endsWith('\n') ? '' : '\n'));
};

/**
 * Run the command in every directory with at most `limit` at once, each
 * result in its directory's slot (discovery order).
 */
const runPool = async (
  run: DirectoryRun,
  paths: string[],
  limit: number,
): Promise<ParallelResult[]> => {
  const results: ParallelResult[] = [];

  // Simple semaphore-based concurrency pool.
  let active = 0;
  let nextIdx = 0;
  const total = paths.length;
  results.length = total;

  await new Promise<void>((resolveAll) => {
    let settled = false;
    let completedCount = 0;

    const tryLaunch = () => {
      while (active < limit && nextIdx < total) {
        const idx = nextIdx++;
        const dirPath = paths[idx] as string;
        active++;

        runCommandResult(run.command, run.shell, {
          cwd: dirPath,
          env: run.env,
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
  });
  return results;
};

/**
 * Parallel mode: run every directory, print the buffered output in
 * discovery order, then report the failures.
 *
 * @returns The first failure's exit code, or `undefined` when none counts.
 */
const runParallel = async (
  run: DirectoryRun,
  paths: string[],
  limit: number,
): Promise<number | undefined> => {
  const { logger } = run;
  const results = await runPool(run, paths, limit);
  const failures: ParallelResult[] = [];

  for (const result of results) {
    logDirectoryHeader(logger, result.dirPath, run.headerCommand);
    writeCaptured(process.stdout, result.stdout);
    writeCaptured(process.stderr, result.stderr);
    if (result.exitCode !== 0) failures.push(result);
  }

  if (failures.length > 0 && !run.ignoreErrors) {
    logger.error('');
    logger.error(
      `${String(failures.length)} of ${String(paths.length)} directories failed:`,
    );
    for (const f of failures) {
      logger.error(`  ${f.dirPath} (exit code ${String(f.exitCode)})`);
    }
    logger.info('');
    return failures[0]?.exitCode ?? 1;
  }
  return undefined;
};

/**
 * Sequential mode: run each directory in turn and stop at the first failure.
 *
 * @returns The failure's exit code, or `undefined` when none counts.
 */
const runSequential = async (
  run: DirectoryRun,
  paths: string[],
  capture: boolean,
): Promise<number | undefined> => {
  const { logger } = run;
  for (const p of paths) {
    logDirectoryHeader(logger, p, run.headerCommand);

    let exitCode: number;
    try {
      exitCode = await runCommand(run.command, run.shell, {
        cwd: p,
        env: run.env,
        stdio: capture ? 'pipe' : 'inherit',
      });
    } catch (error) {
      if (!run.ignoreErrors) throw error;
      exitCode = 1;
    }
    if (exitCode !== 0 && !run.ignoreErrors) {
      logger.error('');
      logger.error(`${p} failed (exit code ${String(exitCode)}); stopping.`);
      logger.info('');
      return exitCode;
    }
  }
  return undefined;
};

/**
 * Execute a batch of commands across multiple directories.
 * Discovers targets via globs/rootPath and runs the command in each.
 *
 * Sequential mode stops at the first directory whose command fails; parallel
 * mode runs every directory and reports the failures. With `ignoreErrors`,
 * failures don't stop the batch or fail it.
 *
 * @returns The batch's exit code: the first failure's exit code (in
 *   discovery order), or 0 when every directory succeeded, when listing, or
 *   with `ignoreErrors`.
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
}: ExecShellCommandBatchOptions): Promise<number> => {
  const capture = shouldCapture(
    (getDotenvCliOptions as { capture?: boolean } | undefined)?.capture,
  );

  // Require a command only when not listing. In list mode, a command is optional.
  if (!command && !list) {
    logger.error(`No command provided. Use --command or --list.`);
    process.exit(1);
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
  // Prepare a safe label for the header (avoid undefined in template)
  const commandLabel = Array.isArray(command)
    ? command.join(' ')
    : typeof command === 'string' && command.length > 0
      ? command
      : '';
  const headerCommand = list ? `CMD:   (list only)` : `CMD:   ${commandLabel}`;
  logBatchHeader(logger, [
    headerTitle,
    `ROOT:  ${absRootPath}`,
    `GLOBS: ${globs}`,
    headerCommand,
  ]);

  // List mode: no parallelism needed.
  if (list) {
    for (const p of paths) {
      logger.info(`CWD:   ${p}`);
    }
    logger.info('');
    return 0;
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
    process.exit(1);
  }

  // Compose child env overlay once (shared across all paths).
  const run: DirectoryRun = {
    command: validCommand,
    shell,
    env: buildSpawnEnv(
      process.env,
      composeNestedEnv(getDotenvCliOptions ?? {}, dotenvEnv ?? {}),
    ),
    headerCommand,
    ignoreErrors,
    logger,
  };
  const failure = parallel
    ? await runParallel(run, paths, concurrency ?? defaultConcurrency)
    : await runSequential(run, paths, capture);
  if (failure !== undefined) return failure;

  logger.info('');
  return 0;
};
