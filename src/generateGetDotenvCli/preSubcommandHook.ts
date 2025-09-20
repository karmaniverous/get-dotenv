import type { Command } from 'commander';
import { execaCommand } from 'execa';

import { resolveCliOptions } from '../cliCore/resolveCliOptions';
import type {
  CommandWithOptions,
  RootOptionsShape,
  ScriptsTable,
} from '../cliCore/types';
import { resolveDotenvWithConfigLoader } from '../config/resolveWithLoader';
import {
  getDotenvCliOptions2Options,
  type Logger,
  type ProcessEnv,
} from '../GetDotenvOptions';
import {
  type GetDotenvCliGenerateOptions,
  type GetDotenvCliPostHookCallback,
  type GetDotenvCliPreHookCallback,
} from './GetDotenvCliGenerateOptions';
import type { GetDotenvCliOptions } from './GetDotenvCliOptions';
import { resolveCommand, resolveShell } from './resolve';

/**
 * Context for composing the Commander `preSubcommand` hook. * * @property logger - Logger compatible with `console` (must support `log`, optional `error`).
 * @property preHook - Optional async pre-hook called before command execution; may mutate options.
 * @property postHook - Optional async post-hook called after `getDotenv` has run.
 * @property defaults - Generator defaults used to resolve tri-state flags with exact-optional semantics.
 *
 * @remarks
 * Flags resolved here are set or deleted via
 * {@link generateGetDotenvCli/flagUtils.setOptionalFlag | setOptionalFlag} to
 * // fully-qualified link target for TypeDoc navigation
 * preserve exactOptionalPropertyTypes behavior.
 */
export type PreSubHookContext = {
  logger: Logger;
  preHook?: GetDotenvCliPreHookCallback;
  postHook?: GetDotenvCliPostHookCallback;
  defaults: Partial<
    Pick<
      GetDotenvCliGenerateOptions,
      | 'debug'
      | 'excludeDynamic'
      | 'excludeEnv'
      | 'excludeGlobal'
      | 'excludePrivate'
      | 'excludePublic'
      | 'loadProcess'
      | 'log'
      | 'shell'
      | 'scripts'
    >
  >;
};
/**
 * Omit a "logger" key from an options object in a typed manner.
 */
const omitLogger = <U extends { logger?: unknown }>(
  obj: U,
): Omit<U, 'logger'> => {
  const { logger: _omitted, ...rest } = obj;
  return rest;
};
/**
 * Build the Commander preSubcommand hook using the provided context.
 * * Responsibilities:
 * - Merge parent CLI options with current invocation (parent \< current). * - Resolve tri-state flags, including `--exclude-all` overrides.
 * - Normalize the shell setting to a concrete value (string | boolean).
 * - Persist merged options on the command instance and pass to subcommands.
 * - Execute {@link getDotenv} and optional post-hook.
 * - Either forward to the default `cmd` subcommand or execute `--command`.
 *
 * @param context - See {@link PreSubHookContext}.
 * @returns An async hook suitable for Commander’s `preSubcommand`.
 *
 * @example `program.hook('preSubcommand', makePreSubcommandHook(ctx));`
 */
export const makePreSubcommandHook = <
  T extends RootOptionsShape & { scripts?: ScriptsTable } = GetDotenvCliOptions,
>({
  logger,
  preHook,
  postHook,
  defaults,
}: {
  logger: Logger;
  preHook?: GetDotenvCliPreHookCallback;
  postHook?: GetDotenvCliPostHookCallback;
  defaults: Partial<T>;
}) => {
  return async (thisCommand: CommandWithOptions<T> | Command) => {
    // Get raw CLI options from commander.
    const rawCliOptions = (thisCommand as CommandWithOptions<T>).opts();

    const { merged: mergedGetDotenvCliOptions, command: commandOpt } =
      resolveCliOptions<T>(
        rawCliOptions,
        defaults,
        process.env.getDotenvCliOptions,
      );
    // Optional debug logging retained via mergedGetDotenvCliOptions.debug if desired.    // Execute pre-hook.
    if (preHook) {
      await preHook(
        mergedGetDotenvCliOptions as unknown as GetDotenvCliOptions,
      );
      if (mergedGetDotenvCliOptions.debug)
        logger.debug(
          '\n*** GetDotenvCliOptions after pre-hook ***\n',
          mergedGetDotenvCliOptions,
        );
    }

    // Persist GetDotenvCliOptions in command for subcommand access.
    (thisCommand as CommandWithOptions<T>).getDotenvCliOptions =
      mergedGetDotenvCliOptions as unknown as T;

    // Execute getdotenv via always-on config loader/overlay path.
    const serviceOptions = getDotenvCliOptions2Options(
      mergedGetDotenvCliOptions,
    );
    const dotenv: ProcessEnv =
      await resolveDotenvWithConfigLoader(serviceOptions);
    // Execute post-hook.
    if (postHook) await postHook(dotenv); // Execute command.
    const args = (thisCommand as { args?: unknown[] }).args ?? [];
    const isCommand = typeof commandOpt === 'string' && commandOpt.length > 0;
    if (isCommand && args.length > 0) {
      const lr = logger as unknown as {
        log: (...a: unknown[]) => void;
        error?: (...a: unknown[]) => void;
      };
      (lr.error ?? lr.log)(`--command option conflicts with cmd subcommand.`);
      process.exit(0);
    }

    if (typeof commandOpt === 'string' && commandOpt.length > 0) {
      const cmd = resolveCommand(
        mergedGetDotenvCliOptions.scripts as ScriptsTable | undefined,
        commandOpt,
      );
      if (mergedGetDotenvCliOptions.debug)
        logger.debug('\n*** command ***\n', cmd);

      // Build a logger-free bag for env round-trip.
      const envSafe = omitLogger(
        mergedGetDotenvCliOptions as unknown as GetDotenvCliOptions & {
          logger?: unknown;
        },
      );
      await execaCommand(cmd, {
        env: { ...process.env, getDotenvCliOptions: JSON.stringify(envSafe) },
        shell: resolveShell(
          mergedGetDotenvCliOptions.scripts as ScriptsTable | undefined,
          commandOpt,
          mergedGetDotenvCliOptions.shell,
        ) as unknown as string | boolean | URL,
        stdio: 'inherit',
      });
    }
  };
};
