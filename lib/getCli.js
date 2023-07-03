// npm imports
import { boolean } from 'boolean';
import { Command, Option } from 'commander';
import { execaCommand } from 'execa';
import fromPairs from 'lodash.frompairs';
import isString from 'lodash.isstring';

// lib imports
import { dotenvDefaults } from './dotenvDefaults.js';
import { dotenvExpand } from './dotenvExpand.js';
import { getDotenv } from './getDotenv.js';

const booleanExpand = (value) => boolean(dotenvExpand(value));

/**
 * GetDotenv CLI Options type
 *
 * @typedef {Object} GetDotenvCliOptions
 * @property {string} [cliInvocation] - cli invocation string (used for cli help)
 * @property {bool} [debug] - debug mode
 * @property {string} [defaultEnv] - default target environment
 * @property {string} [dotenvToken] - token indicating a dotenv file
 * @property {string} [dynamicPath] - path to file exporting an object keyed to dynamic variable functions
 * @property {string} [env] - target environment
 * @property {bool} [excludeDynamic] - exclude dynamic variables
 * @property {bool} [excludeEnv] - exclude environment-specific variables
 * @property {bool} [excludeGlobal] - exclude global & dynamic variables
 * @property {bool} [excludePrivate] - exclude private variables
 * @property {bool} [excludePublic] - exclude public variables
 * @property {bool} [log] - log result to console
 * @property {function} [logger] - logger function
 * @property {string} [outputPath] - if populated, writes consolidated .env file to this path (follows {@link https://github.com/motdotla/dotenv-expand/blob/master/tests/.env dotenv-expand rules})
 * @property {string} [paths] - space-delimited list of input directory paths
 * @property {string} [privateToken] - token indicating private variables.
 * @property {string} [shell] - execa shell option
 * @property {bool} [suppressDotenv] - suppress dotenv loading
 */

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
 * @param {GetDotenvCliOptions} options - GetDotenv CLI Options object
 * @param {object} dotenv - dotenv object
 */

/**
 * GetDotenv CLI Config type
 *
 * @typedef {Object} GetDotenvCliConfig
 * @property {object} [config] - config options
 * @property {GetDotenvCliOptions} [config.defaultOptions] - default options
 * @property {GetDotenvPreHookCallback} [config.preHook] - transforms inbound options & executes side effects
 * @property {GetDotenvPostHookCallback} [config.postHook] - executes side effects within getdotenv context
 */

/**
 * Generate a CLI for get-dotenv.
 *
 * @param {GetDotenvCliConfig} [config] - config object
 * @returns {object} The CLI command.
 */
export const getCli = ({ defaultOptions = {}, preHook, postHook } = {}) => {
  let {
    cliInvocation = 'getdotenv',
    command,
    defaultEnv = 'dev',
    dotenvToken,
    dynamicPath,
    env,
    excludeDynamic,
    excludeEnv,
    excludeGlobal,
    excludePrivate,
    excludePublic,
    log,
    outputPath,
    paths,
    pathsDelimiter = '\\s+',
    privateToken,
    shell,
    suppressDotenv,
    vars,
    varsAssignor = '=',
    varsDelimiter = '\\s+',
  } = {
    ...dotenvDefaults,
    ...defaultOptions,
  };

  if (Array.isArray(paths)) paths = paths.join(' ');

  return new Command()
    .name(cliInvocation)
    .description(
      'Base CLI. All options except delimiters follow dotenv-expand rules.'
    )
    .enablePositionalOptions()
    .passThroughOptions()
    .option('-e, --env <string>', 'target environment', dotenvExpand, env)
    .option(
      '--default-env <string>',
      'default target environment',
      dotenvExpand,
      defaultEnv
    )
    .option(
      '-p, --paths <string>',
      'delimited list of paths to dotenv directory',
      dotenvExpand,
      paths
    )
    .option(
      '--paths-delimiter <string>',
      'regex paths delimiter',
      pathsDelimiter
    )
    .option(
      '-v, --vars <string>',
      'delimited list KEY=VALUE pairs',
      dotenvExpand,
      vars
    )
    .option('--vars-delimiter <string>', 'regex vars delimiter', varsDelimiter)
    .option(
      '--vars-assignor <string>',
      'regex vars assignment operator',
      varsAssignor
    )
    .option(
      '-y, --dynamic-path <string>',
      'dynamic variables path',
      dotenvExpand,
      dynamicPath
    )
    .option(
      '-o, --output-path <string>',
      'consolidated output file, follows dotenv-expand rules using loaded env vars',
      dotenvExpand,
      outputPath
    )
    .addOption(
      new Option(
        '-n, --exclude-env',
        `exclude environment-specific variables${
          excludeEnv ? ' (default)' : ''
        }`
      ).conflicts('excludeEnvOff')
    )
    .addOption(
      new Option(
        '-N, --exclude-env-off',
        `exclude environment-specific variables OFF${
          !excludeEnv ? ' (default)' : ''
        }`
      ).conflicts('excludeEnv')
    )
    .addOption(
      new Option(
        '-g, --exclude-global',
        `exclude global variables${excludeGlobal ? ' (default)' : ''}`
      ).conflicts('excludeGlobalOff')
    )
    .addOption(
      new Option(
        '-G, --exclude-global-off',
        `exclude global variables OFF${!excludeGlobal ? ' (default)' : ''}`
      ).conflicts('excludeGlobal')
    )
    .addOption(
      new Option(
        '-r, --exclude-private',
        `exclude private variables${excludePrivate ? ' (default)' : ''}`
      ).conflicts('excludePrivateOff')
    )
    .addOption(
      new Option(
        '-R, --exclude-private-off',
        `exclude private variables OFF${!excludePrivate ? ' (default)' : ''}`
      ).conflicts('excludePrivate')
    )
    .addOption(
      new Option(
        '-u, --exclude-public',
        `exclude public variables${excludePublic ? ' (default)' : ''}`
      ).conflicts('excludePublicOff')
    )
    .addOption(
      new Option(
        '-U, --exclude-public-off',
        `exclude public variables OFF${!excludePublic ? ' (default)' : ''}`
      ).conflicts('excludePublic')
    )
    .addOption(
      new Option(
        '-z, --exclude-dynamic',
        `exclude dynamic variables${excludeDynamic ? ' (default)' : ''}`
      ).conflicts('excludeDynamicOff')
    )
    .addOption(
      new Option(
        '-Z, --exclude-dynamic-off',
        `exclude dynamic variables OFF${!excludeDynamic ? ' (default)' : ''}`
      ).conflicts('excludeDynamic')
    )
    .addOption(
      new Option(
        '-l, --log',
        `console log extracted variables${log ? ' (default)' : ''}`
      ).conflicts('logOff')
    )
    .addOption(
      new Option(
        '-L, --log-off',
        `console log extracted variables OFF${!log ? ' (default)' : ''}`
      ).conflicts('log')
    )
    .option(
      '-x, --suppress-dotenv',
      'suppress dotenv loading',
      booleanExpand,
      suppressDotenv ?? false
    )
    .option(
      '-c, --command <string>',
      'shell command string',
      dotenvExpand,
      command
    )
    .option('-s, --shell <string>', 'execa shell option', dotenvExpand, shell)
    .option(
      '--dotenv-token <string>',
      'token indicating a dotenv file',
      dotenvExpand,
      dotenvToken
    )
    .option(
      '--private-token <string>',
      'token indicating private variables',
      dotenvExpand,
      privateToken
    )
    .option('-D, --debug', 'debug mode')
    .addCommand(
      new Command()
        .name('cmd')
        .description('execute shell command string (default command)')
        .configureHelp({ showGlobalOptions: true })
        .enablePositionalOptions()
        .passThroughOptions()
        .action(async (options, { args, parent }) => {
          if (args.length)
            await execaCommand(args.join(' '), {
              stdio: 'inherit',
              shell: parent.opts().shell,
            });
        }),
      { isDefault: true }
    )
    .hook('preSubcommand', async (thisCommand) => {
      // Inherit options from parent command.
      const getdotenvOptions = process.env['getdotenvOptions']
        ? JSON.parse(process.env['getdotenvOptions'])
        : {};

      const {
        excludeDynamicOff,
        excludeEnvOff,
        excludeGlobalOff,
        excludePrivateOff,
        excludePublicOff,
        logOff,
        ...localOptions
      } = thisCommand.opts();

      if (excludeDynamicOff) localOptions.excludeDynamic = false;
      if (excludeEnvOff) localOptions.excludeEnv = false;
      if (excludeGlobalOff) localOptions.excludeGlobal = false;
      if (excludePrivateOff) localOptions.excludePrivate = false;
      if (excludePublicOff) localOptions.excludePublic = false;
      if (logOff) localOptions.log = false;

      let mergedOptions = {
        ...getdotenvOptions,
        ...localOptions,
      };

      // Execute pre-hook.
      const options = preHook
        ? (await preHook(mergedOptions)) ?? mergedOptions
        : mergedOptions;

      // Get options.
      let {
        command,
        debug,
        defaultEnv,
        env,
        paths,
        pathsDelimiter,
        suppressDotenv,
        vars: varsStr,
        varsDelimiter,
        varsAssignor,
        ...rest
      } = options;

      // Parse vars.
      const vars = varsStr?.length
        ? fromPairs(
            varsStr
              .split(new RegExp(varsDelimiter))
              .map((v) => v.split(new RegExp(varsAssignor)))
          )
        : undefined;

      if (debug) {
        console.log('*** getdotenvOptions ***', getdotenvOptions);
        console.log('*** localOptions ***', localOptions);
        console.log('*** mergedOptions ***', mergedOptions);
        console.log('*** options ***', options);
        console.log('*** vars ***', vars);
      }

      // Execute getdotenv.
      if (paths?.length && !suppressDotenv) {
        if (isString(paths)) paths = paths?.split(new RegExp(pathsDelimiter));

        var dotenv = await getDotenv({
          ...rest,
          env: env ?? defaultEnv,
          loadProcess: true,
          paths,
          vars,
        });
      }

      if (debug) console.log('*** dotenv ***', dotenv);

      // Execute post-hook.
      if (postHook) await postHook(options, dotenv);

      // Execute shell command.
      if (command)
        await execaCommand(command, {
          stdio: 'inherit',
          shell,
        });
    });
};
