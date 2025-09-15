import { Command, Option } from '@commander-js/extra-typings';
import { execaCommand } from 'execa';

import { dotenvExpandFromProcessEnv } from '../dotenvExpand';
import { getDotenv } from '../getDotenv';
import { getDotenvCliOptions2Options } from '../GetDotenvOptions';
import { defaultsDeep } from '../util/defaultsDeep';
import { batchCommand } from './batchCommand';
import { cmdCommand } from './cmdCommand';
import {
  type GetDotenvCliGenerateOptions,
  resolveGetDotenvCliGenerateOptions,
} from './GetDotenvCliGenerateOptions';
import type { GetDotenvCliOptions, Scripts } from './GetDotenvCliOptions';
import { resolveCommand, resolveShell } from './resolve';
const resolveExclusion = (
  exclude: boolean | undefined,
  excludeOff: true | undefined,
  defaultValue: boolean | undefined,
) =>
  exclude ? true : excludeOff ? undefined : defaultValue ? true : undefined;

const resolveExclusionAll = (
  exclude: boolean | undefined,
  excludeOff: true | undefined,
  defaultValue: boolean | undefined,
  excludeAll: true | undefined,
  excludeAllOff: true | undefined,
) =>
  excludeAll && !excludeOff
    ? true
    : excludeAllOff && !exclude
      ? undefined
      : defaultValue
        ? true
        : undefined;

/**
 * Generate a Commander CLI Command for get-dotenv.
 */
export const generateGetDotenvCli = async (
  customOptions: Pick<GetDotenvCliGenerateOptions, 'importMetaUrl'> &
    Partial<Omit<GetDotenvCliGenerateOptions, 'importMetaUrl'>>,
): Promise<Command> => {
  const {
    alias,
    debug,
    defaultEnv,
    description,
    dotenvToken,
    dynamicPath,
    env,
    excludeDynamic,
    excludeEnv,
    excludeGlobal,
    excludePrivate,
    excludePublic,
    loadProcess,
    log,
    logger,
    outputPath,
    paths,
    pathsDelimiter,
    pathsDelimiterPattern,
    postHook,
    preHook,
    privateToken,
    scripts,
    shell,
    varsAssignor,
    varsAssignorPattern,
    varsDelimiter,
    varsDelimiterPattern,
  } = await resolveGetDotenvCliGenerateOptions(customOptions);

  const excludeAll =
    !!excludeDynamic &&
    ((!!excludeEnv && !!excludeGlobal) ||
      (!!excludePrivate && !!excludePublic));

  return new Command()
    .name(alias)
    .description(description)
    .enablePositionalOptions()
    .passThroughOptions()
    .option(
      '-e, --env <string>',
      `target environment (dotenv-expanded)`,
      dotenvExpandFromProcessEnv,
      env,
    )
    .option(
      '-v, --vars <string>',
      `extra variables expressed as delimited key-value pairs (dotenv-expanded): ${[
        ['KEY1', 'VAL1'],
        ['KEY2', 'VAL2'],
      ]
        .map((v) => v.join(varsAssignor))
        .join(varsDelimiter)}`,
      dotenvExpandFromProcessEnv,
    )
    .option(
      '-c, --command <string>',
      'command executed according to the --shell option, conflicts with cmd subcommand (dotenv-expanded)',
      dotenvExpandFromProcessEnv,
    )
    .option(
      '-o, --output-path <string>',
      'consolidated output file  (dotenv-expanded)',
      dotenvExpandFromProcessEnv,
      outputPath,
    )
    .addOption(
      new Option(
        '-s, --shell [string]',
        (() => {
          const defaultLabel = shell
            ? ` (default ${typeof shell === 'boolean' ? 'OS shell' : shell})`
            : '';
          return `command execution shell, no argument for default OS shell or provide shell string${defaultLabel}`;
        })(),
      ).conflicts('shellOff'),
    )
    .addOption(
      new Option(
        '-S, --shell-off',
        `command execution shell OFF${!shell ? ' (default)' : ''}`,
      ).conflicts('shell'),
    )
    .addOption(
      new Option(
        '-p, --load-process',
        `load variables to process.env ON${loadProcess ? ' (default)' : ''}`,
      ).conflicts('loadProcessOff'),
    )
    .addOption(
      new Option(
        '-P, --load-process-off',
        `load variables to process.env OFF${!loadProcess ? ' (default)' : ''}`,
      ).conflicts('loadProcess'),
    )
    .addOption(
      new Option(
        '-a, --exclude-all',
        `exclude all dotenv variables from loading ON${
          excludeAll ? ' (default)' : ''
        }`,
      ).conflicts('excludeAllOff'),
    )
    .addOption(
      new Option(
        '-A, --exclude-all-off',
        `exclude all dotenv variables from loading OFF${
          !excludeAll ? ' (default)' : ''
        }`,
      ).conflicts('excludeAll'),
    )
    .addOption(
      new Option(
        '-z, --exclude-dynamic',
        `exclude dynamic dotenv variables from loading ON${
          excludeDynamic ? ' (default)' : ''
        }`,
      ).conflicts('excludeDynamicOff'),
    )
    .addOption(
      new Option(
        '-Z, --exclude-dynamic-off',
        `exclude dynamic dotenv variables from loading OFF${
          !excludeDynamic ? ' (default)' : ''
        }`,
      ).conflicts('excludeDynamic'),
    )
    .addOption(
      new Option(
        '-n, --exclude-env',
        `exclude environment-specific dotenv variables from loading${
          excludeEnv ? ' (default)' : ''
        }`,
      ).conflicts('excludeEnvOff'),
    )
    .addOption(
      new Option(
        '-N, --exclude-env-off',
        `exclude environment-specific dotenv variables from loading OFF${
          !excludeEnv ? ' (default)' : ''
        }`,
      ).conflicts('excludeEnv'),
    )
    .addOption(
      new Option(
        '-g, --exclude-global',
        `exclude global dotenv variables from loading ON${
          excludeGlobal ? ' (default)' : ''
        }`,
      ).conflicts('excludeGlobalOff'),
    )
    .addOption(
      new Option(
        '-G, --exclude-global-off',
        `exclude global dotenv variables from loading OFF${
          !excludeGlobal ? ' (default)' : ''
        }`,
      ).conflicts('excludeGlobal'),
    )
    .addOption(
      new Option(
        '-r, --exclude-private',
        `exclude private dotenv variables from loading ON${
          excludePrivate ? ' (default)' : ''
        }`,
      ).conflicts('excludePrivateOff'),
    )
    .addOption(
      new Option(
        '-R, --exclude-private-off',
        `exclude private dotenv variables from loading OFF${
          !excludePrivate ? ' (default)' : ''
        }`,
      ).conflicts('excludePrivate'),
    )
    .addOption(
      new Option(
        '-u, --exclude-public',
        `exclude public dotenv variables from loading ON${
          excludePublic ? ' (default)' : ''
        }`,
      ).conflicts('excludePublicOff'),
    )
    .addOption(
      new Option(
        '-U, --exclude-public-off',
        `exclude public dotenv variables from loading OFF${
          !excludePublic ? ' (default)' : ''
        }`,
      ).conflicts('excludePublic'),
    )
    .addOption(
      new Option(
        '-l, --log',
        `console log loaded variables ON${log ? ' (default)' : ''}`,
      ).conflicts('logOff'),
    )
    .addOption(
      new Option(
        '-L, --log-off',
        `console log loaded variables OFF${!log ? ' (default)' : ''}`,
      ).conflicts('log'),
    )
    .addOption(
      new Option(
        '-d, --debug',
        `debug mode ON${debug ? ' (default)' : ''}`,
      ).conflicts('debugOff'),
    )
    .addOption(
      new Option(
        '-D, --debug-off',
        `debug mode OFF${!debug ? ' (default)' : ''}`,
      ).conflicts('debug'),
    )
    .option(
      '--default-env <string>',
      'default target environment',
      dotenvExpandFromProcessEnv,
      defaultEnv,
    )
    .option(
      '--dotenv-token <string>',
      'dotenv-expanded token indicating a dotenv file',
      dotenvExpandFromProcessEnv,
      dotenvToken,
    )
    .option(
      '--dynamic-path <string>',
      'dynamic variables path',
      dotenvExpandFromProcessEnv,
      dynamicPath,
    )
    .option(
      '--paths <string>',
      'dotenv-expanded delimited list of paths to dotenv directory',
      dotenvExpandFromProcessEnv,
      paths,
    )
    .option(
      '--paths-delimiter <string>',
      'paths delimiter string',
      pathsDelimiter,
    )
    .option(
      '--paths-delimiter-pattern <string>',
      'paths delimiter regex pattern',
      pathsDelimiterPattern,
    )
    .option(
      '--private-token <string>',
      'dotenv-expanded token indicating private variables',
      dotenvExpandFromProcessEnv,
      privateToken,
    )
    .option('--vars-delimiter <string>', 'vars delimiter string', varsDelimiter)
    .option(
      '--vars-delimiter-pattern <string>',
      'vars delimiter regex pattern',
      varsDelimiterPattern,
    )
    .option(
      '--vars-assignor <string>',
      'vars assignment operator string',
      varsAssignor,
    )
    .option(
      '--vars-assignor-pattern <string>',
      'vars assignment operator regex pattern',
      varsAssignorPattern,
    )
    .addOption(
      new Option('--scripts <string>')
        .default(JSON.stringify(scripts))
        .hideHelp(),
    )

    .addCommand(batchCommand)
    .addCommand(cmdCommand, { isDefault: true })
    .hook('preSubcommand', async (thisCommand) => {
      // Get parent command GetDotenvCliOptions.
      const parentGetDotenvCliOptions = process.env.getDotenvCliOptions
        ? (JSON.parse(process.env.getDotenvCliOptions) as GetDotenvCliOptions)
        : undefined;

      // Get raw CLI options from commander.
      const rawCliOptions = thisCommand.opts();

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
      } = rawCliOptions;

      const currentGetDotenvCliOptions: Partial<GetDotenvCliOptions> =
        // Narrow rawCommander options to CLI options surface
        rawCliOptionsRest as Partial<GetDotenvCliOptions>;

      if (scripts)
        currentGetDotenvCliOptions.scripts = JSON.parse(scripts) as Scripts;

      // Merge current & parent GetDotenvCliOptions (parent < current).
      const mergedGetDotenvCliOptions = defaultsDeep(
        (parentGetDotenvCliOptions ?? {}) as Partial<GetDotenvCliOptions>,
        currentGetDotenvCliOptions as Partial<GetDotenvCliOptions>,
      ) as unknown as GetDotenvCliOptions;

      // Resolve flags.
      mergedGetDotenvCliOptions.debug = resolveExclusion(
        mergedGetDotenvCliOptions.debug,
        debugOff,
        debug,
      );
      mergedGetDotenvCliOptions.excludeDynamic = resolveExclusionAll(
        mergedGetDotenvCliOptions.excludeDynamic,
        excludeDynamicOff,
        excludeDynamic,
        excludeAll,
        excludeAllOff,
      );

      mergedGetDotenvCliOptions.excludeEnv = resolveExclusionAll(
        mergedGetDotenvCliOptions.excludeEnv,
        excludeEnvOff,
        excludeEnv,
        excludeAll,
        excludeAllOff,
      );

      mergedGetDotenvCliOptions.excludeGlobal = resolveExclusionAll(
        mergedGetDotenvCliOptions.excludeGlobal,
        excludeGlobalOff,
        excludeGlobal,
        excludeAll,
        excludeAllOff,
      );

      mergedGetDotenvCliOptions.excludePrivate = resolveExclusionAll(
        mergedGetDotenvCliOptions.excludePrivate,
        excludePrivateOff,
        excludePrivate,
        excludeAll,
        excludeAllOff,
      );

      mergedGetDotenvCliOptions.excludePublic = resolveExclusionAll(
        mergedGetDotenvCliOptions.excludePublic,
        excludePublicOff,
        excludePublic,
        excludeAll,
        excludeAllOff,
      );

      mergedGetDotenvCliOptions.log = resolveExclusion(
        mergedGetDotenvCliOptions.log,
        logOff,
        log,
      );

      mergedGetDotenvCliOptions.loadProcess = resolveExclusion(
        mergedGetDotenvCliOptions.loadProcess,
        loadProcessOff,
        loadProcess,
      );

      // Normalize shell for predictability: explicit default shell per OS.
      const defaultShell =
        process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';
      let resolvedShell: string | boolean | undefined =
        mergedGetDotenvCliOptions.shell;
      if (shellOff) resolvedShell = false;
      else if (resolvedShell === true || resolvedShell === undefined) {
        resolvedShell = defaultShell;
      }
      // if original generator default provided, prefer it when string
      else if (typeof resolvedShell !== 'string' && typeof shell === 'string') {
        resolvedShell = shell;
      }
      mergedGetDotenvCliOptions.shell = resolvedShell;

      if (mergedGetDotenvCliOptions.debug && parentGetDotenvCliOptions) {
        logger.debug(
          '\n*** parent command GetDotenvCliOptions ***\n',
          parentGetDotenvCliOptions,
        );
      }

      if (mergedGetDotenvCliOptions.debug)
        logger.debug('\n*** current command raw options ***\n', rawCliOptions);

      if (mergedGetDotenvCliOptions.debug)
        logger.debug('\n*** merged GetDotenvCliOptions ***\n', {
          mergedGetDotenvCliOptions,
        });

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
        thisCommand as unknown as { getDotenvCliOptions: GetDotenvCliOptions }
      ).getDotenvCliOptions = mergedGetDotenvCliOptions;

      // Execute getdotenv.
      const dotenv = await getDotenv(
        getDotenvCliOptions2Options(mergedGetDotenvCliOptions),
      );
      if (mergedGetDotenvCliOptions.debug)
        logger.debug('\n*** getDotenv output ***\n', dotenv);

      // Execute post-hook.
      if (postHook) await postHook(dotenv);

      // Execute command.
      if (command && thisCommand.args.length) {
        logger.error(`--command option conflicts with cmd subcommand.`);
        process.exit(0);
      }

      if (command) {
        const cmd = resolveCommand(mergedGetDotenvCliOptions.scripts, command);

        if (mergedGetDotenvCliOptions.debug)
          logger.debug('\n*** command ***\n', cmd);

        const { logger: _omit, ...envSafe } =
          mergedGetDotenvCliOptions as unknown as Record<string, unknown>;
        await execaCommand(cmd, {
          env: {
            ...process.env,
            getDotenvCliOptions: JSON.stringify(envSafe),
          },
          // execa.Options.shell is string | boolean | URL (not undefined).
          // We normalized earlier to a concrete value (false, OS default, or provided string).
          shell: resolveShell(
            mergedGetDotenvCliOptions.scripts,
            command,
            mergedGetDotenvCliOptions.shell,
          ) as unknown as string | boolean | URL,
          stdio: 'inherit',
        });
      }
    });
};
