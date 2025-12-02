/* eslint-disable @typescript-eslint/no-deprecated */
import type { Command } from 'commander';
import { Option } from 'commander';

// dynamicOption support detected at runtime (GetDotenvCli subclass)
// NOTE: grouped-help tagging is applied by temporarily wrapping adders below.
import { dotenvExpandFromProcessEnv } from '../dotenvExpand';
import type { RootOptionsShape } from './types';

/**
 * Attach legacy root flags to a Commander program.
 * Uses provided defaults to render help labels without coupling to generators.
 */
export const attachRootOptions = (
  program: Command,
  defaults?: Partial<RootOptionsShape>,
  opts?: {
    // When true, include the legacy "-c, --command" flag at the root.
    // Default: false (omitted).
    includeCommandOption?: boolean;
  },
) => {
  // Install temporary wrappers to tag all options added here as "base".
  const GROUP = 'base';
  const tagLatest = (cmd: Command, group: string) => {
    const optsArr = (cmd as unknown as { options?: unknown[] }).options;
    if (Array.isArray(optsArr) && optsArr.length > 0) {
      const last = optsArr[optsArr.length - 1] as Record<string, unknown>;
      last.__group = group;
    }
  };
  const originalAddOption = program.addOption.bind(program);
  const originalOption = program.option.bind(program) as unknown as (
    ...args: unknown[]
  ) => Command;
  program.addOption = function patchedAdd(opt: Option) {
    // Tag before adding, in case consumers inspect the Option directly.
    (opt as unknown as Record<string, unknown>).__group = GROUP;
    const ret = originalAddOption(opt);
    return ret;
  } as Command['addOption'];
  program.option = function patchedOption(
    this: Command,
    ...args: Parameters<Command['option']>
  ) {
    const ret = originalOption(...(args as unknown[]));
    tagLatest(this, GROUP);
    return ret;
  } as Command['option'];

  const {
    defaultEnv,
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
  } = defaults ?? {};

  const va =
    typeof defaults?.varsAssignor === 'string' ? defaults.varsAssignor : '=';
  const vd =
    typeof defaults?.varsDelimiter === 'string' ? defaults.varsDelimiter : ' ';

  // Build initial chain.
  let p = program
    .enablePositionalOptions()
    .passThroughOptions()
    .option(
      '-e, --env <string>',
      `target environment (dotenv-expanded)`,
      dotenvExpandFromProcessEnv,
      env,
    );

  p = p.option(
    '-v, --vars <string>',
    `extra variables expressed as delimited key-value pairs (dotenv-expanded): ${[
      ['KEY1', 'VAL1'],
      ['KEY2', 'VAL2'],
    ]
      .map((v) => v.join(va))
      .join(vd)}`,
    dotenvExpandFromProcessEnv,
  );

  // Optional legacy root command flag (kept for generated CLI compatibility).
  // Default is OFF; the generator opts in explicitly.
  if (opts?.includeCommandOption === true) {
    p = p.option(
      '-c, --command <string>',
      'command executed according to the --shell option, conflicts with cmd subcommand (dotenv-expanded)',
      dotenvExpandFromProcessEnv,
    );
  }
  p = p
    .option(
      '-o, --output-path <string>',
      'consolidated output file  (dotenv-expanded)',
      dotenvExpandFromProcessEnv,
      outputPath,
    )
    .addOption(
      // Prefer dynamic descriptions when available so help reflects resolved config.
      // Fallback to static strings computed from provided defaults.
      (() => {
        const anyProg = program as unknown as {
          createDynamicOption?: (
            flags: string,
            desc: (cfg: { shell?: string | boolean }) => string,
            parser?: (v: string) => unknown,
            def?: unknown,
          ) => Option;
        };
        if (typeof anyProg.createDynamicOption === 'function') {
          return anyProg
            .createDynamicOption('-s, --shell [string]', (cfg) => {
              const s = cfg.shell;
              let tag = '';
              if (typeof s === 'boolean' && s) tag = ' (default OS shell)';
              else if (typeof s === 'string' && s.length > 0)
                tag = ` (default ${s})`;
              return `command execution shell, no argument for default OS shell or provide shell string${tag}`;
            })
            .conflicts('shellOff');
        }
        // Static fallback (computed from defaults)
        const defaultLabel =
          shell !== undefined
            ? typeof shell === 'boolean'
              ? ' (default OS shell)'
              : typeof shell === 'string'
                ? ` (default ${shell})`
                : ''
            : '';
        return new Option(
          '-s, --shell [string]',
          `command execution shell, no argument for default OS shell or provide shell string${defaultLabel}`,
        ).conflicts('shellOff');
      })(),
    )
    .addOption(
      (() => {
        const anyProg = program as unknown as {
          createDynamicOption?: (
            flags: string,
            desc: (cfg: { shell?: string | boolean }) => string,
            parser?: (v: string) => unknown,
            def?: unknown,
          ) => Option;
        };
        if (typeof anyProg.createDynamicOption === 'function') {
          return anyProg
            .createDynamicOption(
              '-S, --shell-off',
              (cfg) =>
                `command execution shell OFF${
                  cfg.shell === false ? ' (default)' : ''
                }`,
            )
            .conflicts('shell');
        }
        return new Option(
          '-S, --shell-off',
          `command execution shell OFF${!shell ? ' (default)' : ''}`,
        ).conflicts('shell');
      })(),
    )
    .addOption(
      (() => {
        const anyProg = program as unknown as {
          createDynamicOption?: (
            flags: string,
            desc: (cfg: { loadProcess?: boolean }) => string,
            parser?: (v: string) => unknown,
            def?: unknown,
          ) => Option;
        };
        if (typeof anyProg.createDynamicOption === 'function') {
          return anyProg
            .createDynamicOption(
              '-p, --load-process',
              (cfg) =>
                `load variables to process.env ON${
                  cfg.loadProcess ? ' (default)' : ''
                }`,
            )
            .conflicts('loadProcessOff');
        }
        return new Option(
          '-p, --load-process',
          `load variables to process.env ON${loadProcess ? ' (default)' : ''}`,
        ).conflicts('loadProcessOff');
      })(),
    )
    .addOption(
      (() => {
        const anyProg = program as unknown as {
          createDynamicOption?: (
            flags: string,
            desc: (cfg: { loadProcess?: boolean }) => string,
            parser?: (v: string) => unknown,
            def?: unknown,
          ) => Option;
        };
        if (typeof anyProg.createDynamicOption === 'function') {
          return anyProg
            .createDynamicOption(
              '-P, --load-process-off',
              (cfg) =>
                `load variables to process.env OFF${
                  cfg.loadProcess ? '' : ' (default)'
                }`,
            )
            .conflicts('loadProcess');
        }
        return new Option(
          '-P, --load-process-off',
          `load variables to process.env OFF${!loadProcess ? ' (default)' : ''}`,
        ).conflicts('loadProcess');
      })(),
    )
    .addOption(
      new Option(
        '-a, --exclude-all',
        `exclude all dotenv variables from loading ON${
          excludeDynamic &&
          ((excludeEnv && excludeGlobal) || (excludePrivate && excludePublic))
            ? ' (default)'
            : ''
        }`,
      ).conflicts('excludeAllOff'),
    )
    .addOption(
      new Option(
        '-A, --exclude-all-off',
        `exclude all dotenv variables from loading OFF (default)`,
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
      (() => {
        const anyProg = program as unknown as {
          createDynamicOption?: (
            flags: string,
            desc: (cfg: { log?: boolean }) => string,
            parser?: (v: string) => unknown,
            def?: unknown,
          ) => Option;
        };
        if (typeof anyProg.createDynamicOption === 'function') {
          return anyProg
            .createDynamicOption(
              '-l, --log',
              (cfg) =>
                `console log loaded variables ON${cfg.log ? ' (default)' : ''}`,
            )
            .conflicts('logOff');
        }
        return new Option(
          '-l, --log',
          `console log loaded variables ON${log ? ' (default)' : ''}`,
        ).conflicts('logOff');
      })(),
    )
    .addOption(
      (() => {
        const anyProg = program as unknown as {
          createDynamicOption?: (
            flags: string,
            desc: (cfg: { log?: boolean }) => string,
            parser?: (v: string) => unknown,
            def?: unknown,
          ) => Option;
        };
        if (typeof anyProg.createDynamicOption === 'function') {
          return anyProg
            .createDynamicOption(
              '-L, --log-off',
              (cfg) =>
                `console log loaded variables OFF${
                  cfg.log ? '' : ' (default)'
                }`,
            )
            .conflicts('log');
        }
        return new Option(
          '-L, --log-off',
          `console log loaded variables OFF${!log ? ' (default)' : ''}`,
        ).conflicts('log');
      })(),
    )
    .option('--capture', 'capture child process stdio for commands (tests/CI)')
    .option(
      '--redact',
      'mask secret-like values in logs/trace (presentation-only)',
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
    // Hidden scripts pipe-through (stringified)
    .addOption(
      new Option('--scripts <string>')
        .default(JSON.stringify(scripts))
        .hideHelp(),
    );

  // Diagnostics: opt-in tracing; optional variadic keys after the flag.
  p = p.option(
    '--trace [keys...]',
    'emit diagnostics for child env composition (optional keys)',
  );
  // Validation: strict mode fails on env validation issues (warn by default).
  p = p.option(
    '--strict',
    'fail on env validation errors (schema/requiredKeys)',
  );
  // Entropy diagnostics (presentation-only)
  p = p
    .addOption(
      (() => {
        const anyProg = program as unknown as {
          createDynamicOption?: (
            flags: string,
            desc: (cfg: { warnEntropy?: boolean }) => string,
            parser?: (v: string) => unknown,
            def?: unknown,
          ) => Option;
        };
        if (typeof anyProg.createDynamicOption === 'function') {
          return anyProg
            .createDynamicOption(
              '--entropy-warn',
              (cfg) =>
                // Default is effectively ON when warnEntropy is true or undefined.
                `enable entropy warnings${
                  cfg.warnEntropy === false ? '' : ' (default on)'
                }`,
            )
            .conflicts('entropyWarnOff');
        }
        return new Option(
          '--entropy-warn',
          'enable entropy warnings (default on)',
        ).conflicts('entropyWarnOff');
      })(),
    )
    .addOption(
      (() => {
        const anyProg = program as unknown as {
          createDynamicOption?: (
            flags: string,
            desc: (cfg: { warnEntropy?: boolean }) => string,
            parser?: (v: string) => unknown,
            def?: unknown,
          ) => Option;
        };
        if (typeof anyProg.createDynamicOption === 'function') {
          return anyProg
            .createDynamicOption(
              '--entropy-warn-off',
              (cfg) =>
                `disable entropy warnings${
                  cfg.warnEntropy === false ? ' (default)' : ''
                }`,
            )
            .conflicts('entropyWarn');
        }
        return new Option(
          '--entropy-warn-off',
          'disable entropy warnings',
        ).conflicts('entropyWarn');
      })(),
    )
    .option(
      '--entropy-threshold <number>',
      'entropy bits/char threshold (default 3.8)',
    )
    .option(
      '--entropy-min-length <number>',
      'min length to examine for entropy (default 16)',
    )
    .option(
      '--entropy-whitelist <pattern...>',
      'suppress entropy warnings when key matches any regex pattern',
    )
    .option(
      '--redact-pattern <pattern...>',
      'additional key-match regex patterns to trigger redaction',
    );
  // Restore original methods to avoid tagging future additions outside base.
  program.addOption = originalAddOption;
  program.option = originalOption as unknown as Command['option'];
  return p;
};
