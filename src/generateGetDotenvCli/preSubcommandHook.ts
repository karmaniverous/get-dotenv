import { execaCommand } from 'execa';

import { getDotenv } from '../getDotenv';
import { getDotenvCliOptions2Options, type Logger } from '../GetDotenvOptions';
import { defaultsDeep } from '../util/defaultsDeep';
import {
  resolveExclusion,
  resolveExclusionAll,
  setOptionalFlag,
} from './flagUtils';
import {
  type GetDotenvCliGenerateOptions,
  type GetDotenvCliPostHookCallback,
  type GetDotenvCliPreHookCallback,
} from './GetDotenvCliGenerateOptions';
import type { GetDotenvCliOptions, Scripts } from './GetDotenvCliOptions';
import { resolveCommand, resolveShell } from './resolve';

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
 */ export const makePreSubcommandHook =
  ({ logger, preHook, postHook, defaults }: PreSubHookContext) =>
  async (thisCommand: unknown) => {
    // Get parent command GetDotenvCliOptions.
    const parentGetDotenvCliOptions = process.env.getDotenvCliOptions
      ? (JSON.parse(process.env.getDotenvCliOptions) as GetDotenvCliOptions)
      : undefined;

    // Get raw CLI options from commander.
    const rawCliOptions = (
      thisCommand as { opts: () => Record<string, unknown> }
    ).opts();

    // Extract current GetDotenvCliOptions from raw CLI options.
    const {
      command,
      debugOff,
      excludeAll,
      excludeAllOff,
      excludeDynamicOff,
      excludeEnvOff,
      excludeGlobalOff,
      excludePrivateOff,
      excludePublicOff,
      loadProcessOff,
      logOff,
      scripts,
      shellOff,
      ...rawCliOptionsRest
    } = rawCliOptions as Record<string, unknown>;

    const currentGetDotenvCliOptions: Partial<GetDotenvCliOptions> =
      rawCliOptionsRest as Partial<GetDotenvCliOptions>;

    if (scripts)
      currentGetDotenvCliOptions.scripts = JSON.parse(
        scripts as string,
      ) as Scripts;

    // Merge current & parent GetDotenvCliOptions (parent < current).
    const mergedGetDotenvCliOptions = defaultsDeep(
      (parentGetDotenvCliOptions ?? {}) as Partial<GetDotenvCliOptions>,
      currentGetDotenvCliOptions as Partial<GetDotenvCliOptions>,
    ) as unknown as GetDotenvCliOptions;

    // Resolve flags using defaults + current + exclude-all toggles.
    setOptionalFlag(
      mergedGetDotenvCliOptions,
      'debug',
      resolveExclusion(
        mergedGetDotenvCliOptions.debug,
        debugOff as true | undefined,
        defaults.debug,
      ),
    );
    setOptionalFlag(
      mergedGetDotenvCliOptions,
      'excludeDynamic',
      resolveExclusionAll(
        mergedGetDotenvCliOptions.excludeDynamic,
        excludeDynamicOff as true | undefined,
        defaults.excludeDynamic,
        excludeAll as true | undefined,
        excludeAllOff as true | undefined,
      ),
    );
    setOptionalFlag(
      mergedGetDotenvCliOptions,
      'excludeEnv',
      resolveExclusionAll(
        mergedGetDotenvCliOptions.excludeEnv,
        excludeEnvOff as true | undefined,
        defaults.excludeEnv,
        excludeAll as true | undefined,
        excludeAllOff as true | undefined,
      ),
    );
    setOptionalFlag(
      mergedGetDotenvCliOptions,
      'excludeGlobal',
      resolveExclusionAll(
        mergedGetDotenvCliOptions.excludeGlobal,
        excludeGlobalOff as true | undefined,
        defaults.excludeGlobal,
        excludeAll as true | undefined,
        excludeAllOff as true | undefined,
      ),
    );
    setOptionalFlag(
      mergedGetDotenvCliOptions,
      'excludePrivate',
      resolveExclusionAll(
        mergedGetDotenvCliOptions.excludePrivate,
        excludePrivateOff as true | undefined,
        defaults.excludePrivate,
        excludeAll as true | undefined,
        excludeAllOff as true | undefined,
      ),
    );
    setOptionalFlag(
      mergedGetDotenvCliOptions,
      'excludePublic',
      resolveExclusionAll(
        mergedGetDotenvCliOptions.excludePublic,
        excludePublicOff as true | undefined,
        defaults.excludePublic,
        excludeAll as true | undefined,
        excludeAllOff as true | undefined,
      ),
    );
    setOptionalFlag(
      mergedGetDotenvCliOptions,
      'log',
      resolveExclusion(
        mergedGetDotenvCliOptions.log,
        logOff as true | undefined,
        defaults.log,
      ),
    );
    setOptionalFlag(
      mergedGetDotenvCliOptions,
      'loadProcess',
      resolveExclusion(
        mergedGetDotenvCliOptions.loadProcess,
        loadProcessOff as true | undefined,
        defaults.loadProcess,
      ),
    );

    // Normalize shell for predictability: explicit default shell per OS.
    const defaultShell =
      process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';
    let resolvedShell: string | boolean | undefined =
      mergedGetDotenvCliOptions.shell;
    if (shellOff) resolvedShell = false;
    else if (resolvedShell === true || resolvedShell === undefined) {
      resolvedShell = defaultShell;
    } else if (
      typeof resolvedShell !== 'string' &&
      typeof defaults.shell === 'string'
    ) {
      resolvedShell = defaults.shell;
    }
    mergedGetDotenvCliOptions.shell = resolvedShell;

    // exactOptionalPropertyTypes-safe write: delete on undefined; assign otherwise.
    {
      const target = mergedGetDotenvCliOptions as unknown as Record<
        string,
        unknown
      >;
      if (resolvedShell === undefined) delete target.shell;
      else target.shell = resolvedShell;
    }
    if (mergedGetDotenvCliOptions.debug && parentGetDotenvCliOptions) {
      (logger.debug ?? logger.log)(
        '\n*** parent command GetDotenvCliOptions ***\n',
        parentGetDotenvCliOptions,
      );
    }

    if (mergedGetDotenvCliOptions.debug)
      (logger.debug ?? logger.log)(
        '\n*** current command raw options ***\n',
        rawCliOptions,
      );

    if (mergedGetDotenvCliOptions.debug)
      (logger.debug ?? logger.log)('\n*** merged GetDotenvCliOptions ***\n', {
        mergedGetDotenvCliOptions,
      });

    // Execute pre-hook.
    if (preHook) {
      await preHook(mergedGetDotenvCliOptions);

      if (mergedGetDotenvCliOptions.debug)
        (logger.debug ?? logger.log)(
          '\n*** GetDotenvCliOptions after pre-hook ***\n',
          mergedGetDotenvCliOptions,
        );
    }

    // Persist GetDotenvCliOptions in command for subcommand access.
    (
      thisCommand as unknown as { getDotenvCliOptions: GetDotenvCliOptions }
    ).getDotenvCliOptions = mergedGetDotenvCliOptions;

    // Execute getdotenv.
    const dotenv = await getDotenv(
      getDotenvCliOptions2Options(mergedGetDotenvCliOptions),
    );
    if (mergedGetDotenvCliOptions.debug)
      (logger.debug ?? logger.log)('\n*** getDotenv output ***\n', dotenv);

    // Execute post-hook.
    if (postHook) await postHook(dotenv);

    // Execute command.
    {
      const args = (thisCommand as { args?: unknown[] }).args;
      if (command && Array.isArray(args) && args.length) {
        const consoleLike = logger as Console;
        if (typeof consoleLike.error === 'function')
          consoleLike.error(`--command option conflicts with cmd subcommand.`);
        else consoleLike.log(`--command option conflicts with cmd subcommand.`);
        process.exit(0);
      }
    }

    if (command) {
      const cmd = resolveCommand(
        mergedGetDotenvCliOptions.scripts,
        command as string,
      );

      if (mergedGetDotenvCliOptions.debug)
        (logger.debug ?? logger.log)('\n*** command ***\n', cmd);

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
          command as string,
          mergedGetDotenvCliOptions.shell,
        ) as unknown as string | boolean | URL,
        stdio: 'inherit',
      });
    }
  };
