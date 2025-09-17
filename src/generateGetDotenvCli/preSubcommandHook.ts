import { execaCommand } from 'execa';

import { resolveCliOptions } from '../cliCore/resolveCliOptions';
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
 * Context for composing the Commander `preSubcommand` hook. *
 * @property logger - Logger compatible with `console` (must support `log`, optional `error`).
 * @property preHook - Optional async pre-hook called before command execution; may mutate options.
 * @property postHook - Optional async post-hook called after `getDotenv` has run.
 * @property defaults - Generator defaults used to resolve tri-state flags with exact-optional semantics.
 *
 * @remarks
 * Flags resolved here are set or deleted via {@link setOptionalFlag} to
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
 * Build the Commander preSubcommand hook using the provided context.
 *
 * Responsibilities:
 * - Merge parent CLI options with current invocation (parent \< current).
 * - Resolve tri-state flags, including `--exclude-all` overrides.
 * - Normalize the shell setting to a concrete value (string | boolean).
 * - Persist merged options on the command instance and pass to subcommands.
 * - Execute {@link getDotenv} and optional post-hook.
 * - Either forward to the default `cmd` subcommand or execute `--command`.
 *
 * @param context - See {@link PreSubHookContext}.
 * @returns An async hook suitable for Commander’s `preSubcommand`.
 *
 * @example `program.hook('preSubcommand', makePreSubcommandHook(ctx));`
 */ export const makePreSubcommandHook =
  ({ logger, preHook, postHook, defaults }: PreSubHookContext) =>
  async (thisCommand: unknown) => {
    // Get raw CLI options from commander.
    const rawCliOptions = (
      thisCommand as { opts: () => Record<string, unknown> }
    ).opts();

    const { merged: mergedGetDotenvCliOptions, command: commandOpt } =
      resolveCliOptions(
        rawCliOptions,
        (defaults ?? {}) as Record<string, unknown>,
        process.env.getDotenvCliOptions,
      );

    // Optional debug logging retained via mergedGetDotenvCliOptions.debug if desired.

    // Execute pre-hook.
    if (preHook) {
      await preHook(mergedGetDotenvCliOptions);
      if (mergedGetDotenvCliOptions.debug)
        logger.debug(
          '\n*** GetDotenvCliOptions after pre-hook ***\n',
          mergedGetDotenvCliOptions,
        );
    }

    // Persist GetDotenvCliOptions in command for subcommand access.
    (
      thisCommand as { getDotenvCliOptions: GetDotenvCliOptions }
    ).getDotenvCliOptions = mergedGetDotenvCliOptions;

    // Execute getdotenv via always-on config loader/overlay path.
    let dotenv: ProcessEnv;
    const serviceOptions = getDotenvCliOptions2Options(
      mergedGetDotenvCliOptions,
    );
    dotenv = await resolveDotenvWithConfigLoader(serviceOptions);

    // Execute post-hook.
    if (postHook) await postHook(dotenv);
    // Execute command.
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
      const cmd = resolveCommand(mergedGetDotenvCliOptions.scripts, commandOpt);
      if (mergedGetDotenvCliOptions.debug)
        logger.debug('\n*** command ***\n', cmd);

      const envSafe = {
        ...(mergedGetDotenvCliOptions as unknown as Record<string, unknown>),
      };
      delete (envSafe as Record<string, unknown>).logger;
      await execaCommand(cmd, {
        env: {
          ...process.env,
          getDotenvCliOptions: JSON.stringify(envSafe),
        },
        shell: resolveShell(
          mergedGetDotenvCliOptions.scripts,
          commandOpt,
          mergedGetDotenvCliOptions.shell,
        ) as unknown as string | boolean | URL,
        stdio: 'inherit',
      });
    }
  };
