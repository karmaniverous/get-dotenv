import { Command, Option } from '@commander-js/extra-typings';
import { execaCommand } from 'execa';
import _ from 'lodash';

import { dotenvExpandFromProcessEnv } from './dotenvExpand';
import { getDotenv } from './getDotenv';
import {
  defaultGetDotenvCliOptionsGlobal,
  defaultGetDotenvCliOptionsLocal,
  type GetDotenvCliOptions,
} from './GetDotenvCliOptions';
import {
  getDotenvCliOptions2Options,
  type GetDotenvOptions,
  Logger,
  type ProcessEnv,
} from './GetDotenvOptions';

/**
 * GetDotenv CLI Pre-hook Callback function type. Mutates inbound options &
 * executes side effects within the `getDotenv` context.
 */
type GetDotenvCliPreHookCallback = (
  options: GetDotenvCliOptions,
) => Promise<void>;

/**
 * GetDotenv CLI Post-hook Callback function type. Executes side effects within
 * the `getDotenv` context.
 */
type GetDotenvCliPostHookCallback = (dotenv: ProcessEnv) => Promise<void>;

/**
 * `generateGetDotenvCli` options. Defines local instance of the GetDotenv CLI and
 * sets defaults that can be overridden by local `getdotenv.config.json` in
 * projects that import the CLI.
 */
interface GetDotenvCliGenerateOptions extends Omit<GetDotenvCliOptions, 'env'> {
  /**
   * Cli alias. Should align with the `bin` property in `package.json`.
   */
  alias?: string;

  /**
   * Cli description (appears in CLI help).
   */
  description?: string;

  /**
   * Mutates inbound options & executes side effects within the `getDotenv`
   * context before executing CLI commands.
   */
  preHook?: GetDotenvCliPreHookCallback;

  /**
   * Executes side effects within the `getDotenv` context after executing CLI
   * commands.
   */
  postHook?: GetDotenvCliPostHookCallback;
}

/**
 * Commander Commmand extended with GetDotEnvOptions.
 */
interface GetDotenvCommand extends Command {
  getDotenvOptions: GetDotenvOptions;
}

/**
 * Generate a Commander CLI Command for get-dotenv.
 */
export const generateGetDotenvCli = ({
  logger = console as unknown as Logger,
  preHook,
  postHook,
  ...cliOptionsCustom
}: GetDotenvCliGenerateOptions = {}) => {
  const {
    alias = 'getdotenv',
    debug,
    defaultEnv,
    description = 'Base CLI.',
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
    outputPath,
    paths,
    pathsDelimiter,
    pathsDelimiterPattern,
    privateToken,
    varsAssignor,
    varsAssignorPattern,
    varsDelimiter,
    varsDelimiterPattern,
  } = {
    ...defaultGetDotenvCliOptionsGlobal,
    ...(cliOptionsCustom as GetDotenvCliOptions),
    ...defaultGetDotenvCliOptionsLocal,
  };

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
      'shell command string (dotenv-expanded)',
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
    .addCommand(
      new Command()
        .name('cmd')
        .description('execute shell command string (default command)')
        .configureHelp({ showGlobalOptions: true })
        .enablePositionalOptions()
        .passThroughOptions()
        .action(async (options, command: Command) => {
          const {
            args,
            getDotenvOptions: { debug },
          } = command.parent as GetDotenvCommand;

          if (args.length) {
            if (debug) logger.log('\n*** raw shell args ***\n', args);

            const shellCommand = args.join(' ');

            if (debug) logger.log('\n*** shell command ***\n', shellCommand);

            await execaCommand(shellCommand, {
              stdio: 'inherit',
              shell: true,
            });
          }
        }),
      { isDefault: true },
    )
    .hook('preSubcommand', async (thisCommand) => {
      const rawOptions = thisCommand.opts();

      if (rawOptions.debug)
        logger.log('\n*** raw cli options ***\n', { rawOptions });

      // Load options.
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
        ...cliOptions
      } = rawOptions;

      // Resolve flags.
      const resolveExclusion = (
        exclude: true | undefined,
        excludeOff: true | undefined,
        defaultValue: boolean | undefined,
      ) =>
        exclude
          ? true
          : excludeOff
            ? undefined
            : defaultValue
              ? true
              : undefined;

      const resolveExclusionAll = (
        exclude: true | undefined,
        excludeOff: true | undefined,
        defaultValue: boolean | undefined,
      ) =>
        excludeAll && !excludeOff
          ? true
          : excludeAllOff && !exclude
            ? undefined
            : defaultValue
              ? true
              : undefined;

      cliOptions.debug = resolveExclusion(cliOptions.debug, debugOff, debug);

      cliOptions.excludeDynamic = resolveExclusionAll(
        cliOptions.excludeDynamic,
        excludeDynamicOff,
        excludeDynamic,
      );

      cliOptions.excludeEnv = resolveExclusionAll(
        cliOptions.excludeEnv,
        excludeEnvOff,
        excludeEnv,
      );

      cliOptions.excludeGlobal = resolveExclusionAll(
        cliOptions.excludeGlobal,
        excludeGlobalOff,
        excludeGlobal,
      );

      cliOptions.excludePrivate = resolveExclusionAll(
        cliOptions.excludePrivate,
        excludePrivateOff,
        excludePrivate,
      );

      cliOptions.excludePublic = resolveExclusionAll(
        cliOptions.excludePublic,
        excludePublicOff,
        excludePublic,
      );

      cliOptions.log = resolveExclusion(cliOptions.log, logOff, log);

      cliOptions.loadProcess = resolveExclusion(
        cliOptions.loadProcess,
        loadProcessOff,
        loadProcess,
      );

      if (cliOptions.debug)
        logger.log('\n*** cli options after default resolution ***\n', {
          cliOptions,
        });

      // Execute pre-hook.
      if (preHook) {
        await preHook(cliOptions);
        if (cliOptions.debug)
          logger.log('\n*** cli options after pre-hook ***\n', cliOptions);
      }

      // Get getdotenv options from parent command.
      const parentGetdotenvOptions = (
        process.env.getDotenvOptions
          ? JSON.parse(process.env.getDotenvOptions)
          : {}
      ) as GetDotenvOptions;

      const cliGetDotenvOptions = getDotenvCliOptions2Options(cliOptions);

      const getDotenvOptions = {
        ...parentGetdotenvOptions,
        ...cliGetDotenvOptions,
      };

      if (cliOptions.debug)
        logger.log('\n*** getdotenv option resolution ***\n', {
          parentGetdotenvOptions,
          cliGetDotenvOptions,
          getDotenvOptions,
        });

      // Execute getdotenv.
      const getDotenvOptionsWithLogger = { ...getDotenvOptions, logger };

      _.set(thisCommand, 'getDotenvOptions', getDotenvOptionsWithLogger);

      const dotenv = await getDotenv(getDotenvOptionsWithLogger);

      if (cliOptions.debug)
        logger.log('\n*** resulting dotenv values ***\n', { dotenv });

      // Execute post-hook.
      if (postHook) await postHook(dotenv);

      // Execute shell command.
      if (command) {
        if (cliOptions.debug) logger.log('\n*** shell command ***\n', command);

        await execaCommand(command, {
          env: {
            ...process.env,
            getDotenvOptions: JSON.stringify(getDotenvOptions),
          },
          shell: true,
          stdio: 'inherit',
        });
      }
    });
};
