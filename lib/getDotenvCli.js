// npm imports
import { Command, Option } from 'commander';
import { execaCommand } from 'execa';

// lib imports
import { dotenvExpand } from './dotenvExpand.js';
import { getDotenv } from './getDotenv.js';
import {
  cli2getdotenvOptions,
  cliDefaultOptionsGlobal,
  cliDefaultOptionsLocal,
} from './options.js';

/**
 * GetDotenv CLI Pre-hook Callback type. Transforms inbound options & executes side effects.
 *
 * @async
 * @callback GetDotenvPreHookCallback
 * @param {GetDotenvCliOptions} options - inbound GetDotenv CLI Options object
 * @returns {GetDotenvCliOptions} transformed GetDotenv CLI Options object (undefined return value is ignored)
 */

/**
 * GetDotenv CLI Post-hook Callback type. Executes side effects within getdotenv context.
 *
 * @async
 * @callback GetDotenvPostHookCallback
 * @param {object} dotenv - dotenv object
 */

/**
 * Generate a CLI for get-dotenv.
 *
 * @function getDotenvCli
 * @param {object} [options] - options object
 * @param {string} [options.alias] - cli alias (used for cli help)
 * @param {string} [options.command] - {@link https://github.com/motdotla/dotenv-expand/blob/master/tests/.env dotenv-expanded} shell command string
 * @param {bool} [options.debug] - debug mode
 * @param {string} [options.defaultEnv] - default target environment
 * @param {string} [options.description] - cli description (used for cli help)
 * @param {string} [options.dotenvToken] - {@link https://github.com/motdotla/dotenv-expand/blob/master/tests/.env dotenv-expanded} token indicating a dotenv file
 * @param {string} [options.dynamicPath] - path to file exporting an object keyed to dynamic variable functions
 * @param {bool} [options.excludeDynamic] - exclude dynamic dotenv variables
 * @param {bool} [options.excludeEnv] - exclude environment-specific dotenv variables
 * @param {bool} [options.excludeGlobal] - exclude global dotenv variables
 * @param {bool} [options.excludePrivate] - exclude private dotenv variables
 * @param {bool} [options.excludePublic] - exclude public dotenv variables
 * @param {bool} [options.loadProcess] - load variables to process.env
 * @param {bool} [options.log] - log result to console
 * @param {function} [options.logger] - logger function
 * @param {string} [options.outputPath] - consolidated output file, {@link https://github.com/motdotla/dotenv-expand/blob/master/tests/.env dotenv-expanded} using loaded env vars
 * @param {string} [options.paths] - {@link https://github.com/motdotla/dotenv-expand/blob/master/tests/.env dotenv-expanded} delimited list of input directory paths
 * @param {string} [options.pathsDelimiter] - paths delimiter string
 * @param {string} [options.pathsDelimiterPattern] - paths delimiter regex pattern
 * @param {GetDotenvPreHookCallback} [config.preHook] - transforms cli options & executes side effects
 * @param {string} [options.privateToken] - {@link https://github.com/motdotla/dotenv-expand/blob/master/tests/.env dotenv-expanded} token indicating private variables
 * @param {GetDotenvPostHookCallback} [config.postHook] - executes side effects within getdotenv context
 * @param {string} [options.vars] - {@link https://github.com/motdotla/dotenv-expand/blob/master/tests/.env dotenv-expanded} delimited list of explicit environment variable key-value pairs
 * @param {string} [options.varsAssignor] - variable key-value assignor string
 * @param {string} [options.varsAssignorPattern] - variable key-value assignor regex pattern
 * @param {string} [options.varsDelimiter] - variable key-value pair delimiter string
 * @param {string} [options.varsDelimiterPattern] - variable key-value pair delimiter regex pattern
 * @returns {object} The CLI command.
 */
export const getDotenvCli = ({
  logger = console,
  preHook,
  postHook,
  ...cliOptionsCustom
} = {}) => {
  const {
    alias,
    command,
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
    ...cliDefaultOptionsGlobal,
    ...cliOptionsCustom,
    ...cliDefaultOptionsLocal,
  };

  const excludeAll =
    excludeDynamic &&
    ((excludeEnv && excludeGlobal) || (excludePrivate && excludePublic));

  return new Command()
    .name(alias)
    .description(description)
    .enablePositionalOptions()
    .passThroughOptions()
    .option('-e, --env <string>', 'target environment', dotenvExpand, env)
    .option(
      '-v, --vars <string>',
      `dotenv-expanded delimited key-value pairs: ${[
        ['KEY1', 'VAL1'],
        ['KEY2', 'VAL2'],
      ]
        .map((v) => v.join(varsAssignor))
        .join(varsDelimiter)}`,
      dotenvExpand
    )
    .option(
      '-c, --command <string>',
      'dotenv-expanded shell command string',
      dotenvExpand,
      command
    )
    .option(
      '-o, --output-path <string>',
      'consolidated output file, follows dotenv-expand rules using loaded env vars',
      dotenvExpand,
      outputPath
    )
    .addOption(
      new Option(
        '-p, --load-process',
        `load variables to process.env ON${loadProcess ? ' (default)' : ''}`
      ).conflicts('loadProcessOff')
    )
    .addOption(
      new Option(
        '-P, --load-process-off',
        `load variables to process.env OFF${!loadProcess ? ' (default)' : ''}`
      ).conflicts('loadProcess')
    )
    .addOption(
      new Option(
        '-a, --exclude-all',
        `exclude all dotenv variables from loading ON${
          excludeAll ? ' (default)' : ''
        }`
      ).conflicts('excludeAllOff')
    )
    .addOption(
      new Option(
        '-A, --exclude-all-off',
        `exclude all dotenv variables from loading OFF${
          !excludeAll ? ' (default)' : ''
        }`
      ).conflicts('excludeAll')
    )
    .addOption(
      new Option(
        '-z, --exclude-dynamic',
        `exclude dynamic dotenv variables from loading ON${
          excludeDynamic ? ' (default)' : ''
        }`
      ).conflicts('excludeDynamicOff')
    )
    .addOption(
      new Option(
        '-Z, --exclude-dynamic-off',
        `exclude dynamic dotenv variables from loading OFF${
          !excludeDynamic ? ' (default)' : ''
        }`
      ).conflicts('excludeDynamic')
    )
    .addOption(
      new Option(
        '-n, --exclude-env',
        `exclude environment-specific dotenv variables from loading${
          excludeEnv ? ' (default)' : ''
        }`
      ).conflicts('excludeEnvOff')
    )
    .addOption(
      new Option(
        '-N, --exclude-env-off',
        `exclude environment-specific dotenv variables from loading OFF${
          !excludeEnv ? ' (default)' : ''
        }`
      ).conflicts('excludeEnv')
    )
    .addOption(
      new Option(
        '-g, --exclude-global',
        `exclude global dotenv variables from loading ON${
          excludeGlobal ? ' (default)' : ''
        }`
      ).conflicts('excludeGlobalOff')
    )
    .addOption(
      new Option(
        '-G, --exclude-global-off',
        `exclude global dotenv variables from loading OFF${
          !excludeGlobal ? ' (default)' : ''
        }`
      ).conflicts('excludeGlobal')
    )
    .addOption(
      new Option(
        '-r, --exclude-private',
        `exclude private dotenv variables from loading ON${
          excludePrivate ? ' (default)' : ''
        }`
      ).conflicts('excludePrivateOff')
    )
    .addOption(
      new Option(
        '-R, --exclude-private-off',
        `exclude private dotenv variables from loading OFF${
          !excludePrivate ? ' (default)' : ''
        }`
      ).conflicts('excludePrivate')
    )
    .addOption(
      new Option(
        '-u, --exclude-public',
        `exclude public dotenv variables from loading ON${
          excludePublic ? ' (default)' : ''
        }`
      ).conflicts('excludePublicOff')
    )
    .addOption(
      new Option(
        '-U, --exclude-public-off',
        `exclude public dotenv variables from loading OFF${
          !excludePublic ? ' (default)' : ''
        }`
      ).conflicts('excludePublic')
    )
    .addOption(
      new Option(
        '-l, --log',
        `console log loaded variables ON${log ? ' (default)' : ''}`
      ).conflicts('logOff')
    )
    .addOption(
      new Option(
        '-L, --log-off',
        `console log loaded variables OFF${!log ? ' (default)' : ''}`
      ).conflicts('log')
    )
    .addOption(
      new Option(
        '-d, --debug',
        `debug mode ON${debug ? ' (default)' : ''}`
      ).conflicts('debugOff')
    )
    .addOption(
      new Option(
        '-D, --debug-off',
        `debug mode OFF${!debug ? ' (default)' : ''}`
      ).conflicts('debug')
    )
    .option(
      '--default-env <string>',
      'default target environment',
      dotenvExpand,
      defaultEnv
    )
    .option(
      '--dotenv-token <string>',
      'dotenv-expanded token indicating a dotenv file',
      dotenvExpand,
      dotenvToken
    )
    .option(
      '--dynamic-path <string>',
      'dynamic variables path',
      dotenvExpand,
      dynamicPath
    )
    .option(
      '--paths <string>',
      'dotenv-expanded delimited list of paths to dotenv directory',
      dotenvExpand,
      paths
    )
    .option(
      '--paths-delimiter <string>',
      'paths delimiter string',
      pathsDelimiter
    )
    .option(
      '--paths-delimiter-pattern <string>',
      'paths delimiter regex pattern',
      pathsDelimiterPattern
    )
    .option(
      '--private-token <string>',
      'dotenv-expanded token indicating private variables',
      dotenvExpand,
      privateToken
    )
    .option('--vars-delimiter <string>', 'vars delimiter string', varsDelimiter)
    .option(
      '--vars-delimiter-pattern <string>',
      'vars delimiter regex pattern',
      varsDelimiterPattern
    )
    .option(
      '--vars-assignor <string>',
      'vars assignment operator string',
      varsAssignor
    )
    .option(
      '--vars-assignor-pattern <string>',
      'vars assignment operator regex pattern',
      varsAssignorPattern
    )
    .addCommand(
      new Command()
        .name('cmd')
        .description('execute shell command string (default command)')
        .configureHelp({ showGlobalOptions: true })
        .enablePositionalOptions()
        .passThroughOptions()
        .action(async (options, command) => {
          const { args } = command;
          if (args.length)
            await execaCommand(args.join('\\ '), {
              stdio: 'inherit',
              shell: true,
            });
        }),
      { isDefault: true }
    )
    .hook('preSubcommand', async (thisCommand) => {
      const rawOptions = thisCommand.opts();

      if (rawOptions.debug)
        logger.log('\n*** raw cli options ***\n', { rawOptions });

      // Load options.
      let {
        command,
        debugOff,
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
      const resolveExclusion = (exclude, excludeOff, defaultValue) =>
        exclude ? true : excludeOff ? false : defaultValue;

      const resolveExclusionAll = (exclude, excludeOff, defaultValue) =>
        excludeAll && !excludeOff
          ? true
          : excludeAllOff && !exclude
          ? false
          : defaultValue;

      cliOptions.debug = resolveExclusion(cliOptions.debug, debugOff, debug);

      cliOptions.excludeDynamic = resolveExclusionAll(
        cliOptions.excludeDynamic,
        excludeDynamicOff,
        excludeDynamic
      );

      cliOptions.excludeEnv = resolveExclusionAll(
        cliOptions.excludeEnv,
        excludeEnvOff,
        excludeEnv
      );

      cliOptions.excludeGlobal = resolveExclusionAll(
        cliOptions.excludeGlobal,
        excludeGlobalOff,
        excludeGlobal
      );

      cliOptions.excludePrivate = resolveExclusionAll(
        cliOptions.excludePrivate,
        excludePrivateOff,
        excludePrivate
      );

      cliOptions.excludePublic = resolveExclusionAll(
        cliOptions.excludePublic,
        excludePublicOff,
        excludePublic
      );

      cliOptions.log = resolveExclusion(cliOptions.log, logOff, log);

      cliOptions.loadProcess = resolveExclusion(
        cliOptions.loadProcess,
        loadProcessOff,
        loadProcess
      );

      if (cliOptions.debug)
        logger.log('\n*** cli options after default resolution ***\n', {
          cliOptions,
        });

      // Execute pre-hook.
      if (preHook) {
        cliOptions = (await preHook(cliOptions)) ?? cliOptions;
        if (cliOptions.debug)
          logger.log('\n*** cli options after pre-hook ***\n', cliOptions);
      }

      // Get getdotenv options from parent command.
      const parentGetdotenvOptions = process.env.getdotenvOptions
        ? JSON.parse(process.env.getdotenvOptions)
        : {};

      const cliGetdotenvOptions = cli2getdotenvOptions(cliOptions);

      const getdotenvOptions = {
        ...parentGetdotenvOptions,
        ...cliGetdotenvOptions,
      };

      if (cliOptions.debug)
        logger.log('\n*** getdotenv option resolution ***\n', {
          parentGetdotenvOptions,
          cliGetdotenvOptions,
          getdotenvOptions,
        });

      // Execute getdotenv.
      thisCommand.getdotenvOptions = {
        ...getdotenvOptions,
        logger,
      };

      const dotenv = await getDotenv(thisCommand.getdotenvOptions);

      if (cliOptions.debug)
        logger.log('\n*** resulting dotenv values ***\n', { dotenv });

      // Execute post-hook.
      if (postHook) await postHook(dotenv);

      // Execute shell command.
      if (command)
        await execaCommand(command.replace(/ /g, '\\ '), {
          env: {
            ...process.env,
            getdotenvOptions: JSON.stringify(getdotenvOptions),
          },
          shell: true,
          stdio: 'inherit',
        });
    });
};
