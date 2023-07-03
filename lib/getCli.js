// npm imports
import { boolean } from 'boolean';
import { Command } from 'commander';
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
 * @property {bool|string} [shell] - execa shell option
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

  return (
    new Command()
      .name(cliInvocation)
      // .usage('[options] [command] [command options] [commad args]')
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
      .option(
        '--vars-delimiter <string>',
        'regex vars delimiter',
        varsDelimiter
      )
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
      .option(
        '-n, --exclude-env [bool]',
        'exclude environment-specific variables',
        booleanExpand,
        excludeEnv ?? false
      )
      .option(
        '-g, --exclude-global [bool]',
        'exclude global & dynamic variables',
        booleanExpand,
        excludeGlobal ?? false
      )
      .option(
        '-r, --exclude-private [bool]',
        'exclude private variables',
        booleanExpand,
        excludePrivate ?? false
      )
      .option(
        '-u, --exclude-public [bool]',
        'exclude public variables',
        booleanExpand,
        excludePublic ?? false
      )
      .option(
        '-z, --exclude-dynamic [bool]',
        'exclude dynamic variables',
        booleanExpand,
        excludeDynamic ?? false
      )
      .option(
        '-l, --log [bool]',
        'console log extracted variables',
        booleanExpand,
        log ?? false
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
      .addCommand(
        new Command()
          .name('cmd')
          .description('execute shell command string')
          // .description('execute shell command string (default command)')
          .configureHelp({ showGlobalOptions: true })
          .enablePositionalOptions()
          .passThroughOptions()
          .action(async (options, { args, parent }) => {
            if (args.length)
              await execaCommand(args.join(' '), {
                stdio: 'inherit',
                shell: parent.opts().shell,
              });
          })
        // { isDefault: true }
      )
      .hook('preSubcommand', async (thisCommand) => {
        // Inherit options from parent command.
        let options = {
          ...(process.env['getdotenvOptions']
            ? JSON.parse(process.env['getdotenvOptions'])
            : {}),
          ...thisCommand.opts(),
        };

        // Execute pre-hook.
        if (preHook) options = (await preHook(options)) ?? options;

        // Get options.
        let {
          command,
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

        // Execute post-hook.
        if (postHook) await postHook(options, dotenv);

        // Execute shell command.
        if (command)
          await execaCommand(command, {
            stdio: 'inherit',
            shell,
          });
      })
  );
};
