import { Command, Option } from 'commander';

import { dotenvExpandFromProcessEnv } from '../dotenvExpand';
import { batchCommand } from './batchCommand';
import { cmdCommand } from './cmdCommand';
import type { GetDotenvCliGenerateOptions } from './GetDotenvCliGenerateOptions';
/**
 * Create the root Commander command with all options and subcommands.
 * Pure builder: no side-effects; the caller attaches lifecycle hooks.
 */
export const createRootCommand = (
  opts: GetDotenvCliGenerateOptions,
): Command => {
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
    outputPath,
    paths,
    pathsDelimiter,
    pathsDelimiterPattern,
    privateToken,
    scripts,
    shell,
    varsAssignor,
    varsAssignorPattern,
    varsDelimiter,
    varsDelimiterPattern,
  } = opts;

  const excludeAll =
    !!excludeDynamic &&
    ((!!excludeEnv && !!excludeGlobal) ||
      (!!excludePrivate && !!excludePublic));

  const program = new Command()
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
        .map((v) => v.join(varsAssignor ?? '='))
        .join(varsDelimiter ?? ' ')}`,
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
      'dynamic variables path (.js or .ts; .ts is auto-compiled when esbuild is available, otherwise precompile)',
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
    .addCommand(cmdCommand, { isDefault: true });

  return program;
};
