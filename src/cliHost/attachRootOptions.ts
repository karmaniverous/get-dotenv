/* eslint-disable @typescript-eslint/no-deprecated */
import { Option } from 'commander';

import type { RootOptionsShape } from '../cliCore/types';
import { dotenvExpandFromProcessEnv } from '../dotenvExpand';
import type { GetDotenvCli } from './GetDotenvCli';

/**
 * Attach root flags to a GetDotenvCli instance.
 * - Host-only: program is typed as GetDotenvCli and supports dynamicOption/createDynamicOption.
 * - Any flag that displays an effective default in help uses dynamic descriptions.
 */
export const attachRootOptions = (
  program: GetDotenvCli,
  defaults?: Partial<RootOptionsShape>,
  opts?: {
    // When true, include a legacy root "-c, --command" (normally omit; cmd plugin provides parent alias).
    includeCommandOption?: boolean;
  },
) => {
  // Install temporary wrappers to tag all options added here as "base" for grouped help.
  const GROUP = 'base';
  const tagLatest = (cmd: GetDotenvCli, group: string) => {
    const optsArr = (cmd as unknown as { options?: unknown[] }).options;
    if (Array.isArray(optsArr) && optsArr.length > 0) {
      const last = optsArr[optsArr.length - 1] as Record<string, unknown>;
      last.__group = group;
    }
  };
  const originalAddOption = program.addOption.bind(program);

  const originalOption = program.option.bind(program) as unknown as (
    ...args: unknown[]
  ) => GetDotenvCli;
  program.addOption = function patchedAdd(opt: Option) {
    (opt as unknown as Record<string, unknown>).__group = GROUP;
    return originalAddOption(opt);
  } as GetDotenvCli['addOption'];

  program.option = function patchedOption(
    this: GetDotenvCli,
    ...args: Parameters<GetDotenvCli['option']>
  ) {
    const ret = originalOption(...(args as unknown[]));
    tagLatest(this, GROUP);
    return ret;
  } as GetDotenvCli['option'];

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

  // Helper: append (default) tags for ON/OFF toggles
  const onOff = (on: boolean, isDefault: boolean) =>
    on
      ? `ON${isDefault ? ' (default)' : ''}`
      : `OFF${isDefault ? ' (default)' : ''}`;

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

  if (opts?.includeCommandOption === true) {
    p = p.option(
      '-c, --command <string>',
      'command executed according to the --shell option, conflicts with cmd subcommand (dotenv-expanded)',
      dotenvExpandFromProcessEnv,
    );
  }

  // Output path (interpolated later; help can remain static)
  p = p.option(
    '-o, --output-path <string>',
    'consolidated output file  (dotenv-expanded)',
    dotenvExpandFromProcessEnv,
    outputPath,
  );

  // Shell ON (string or boolean true => default shell)
  p = p
    .addOption(
      program
        .createDynamicOption('-s, --shell [string]', (cfg) => {
          const s = (cfg as { shell?: string | boolean }).shell;
          let tag = '';
          if (typeof s === 'boolean' && s) tag = ' (default OS shell)';
          else if (typeof s === 'string' && s.length > 0)
            tag = ` (default ${s})`;
          return `command execution shell, no argument for default OS shell or provide shell string${tag}`;
        })
        .conflicts('shellOff'),
    )
    // Shell OFF
    .addOption(
      program
        .createDynamicOption('-S, --shell-off', (cfg) => {
          const s = (cfg as { shell?: string | boolean }).shell;
          return `command execution shell OFF${s === false ? ' (default)' : ''}`;
        })
        .conflicts('shell'),
    );

  // Load process ON/OFF (dynamic defaults)
  p = p
    .addOption(
      program
        .createDynamicOption(
          '-p, --load-process',
          (cfg) =>
            `load variables to process.env ${onOff(true, Boolean((cfg as { loadProcess?: boolean }).loadProcess))}`,
        )
        .conflicts('loadProcessOff'),
    )
    .addOption(
      program
        .createDynamicOption(
          '-P, --load-process-off',
          (cfg) =>
            `load variables to process.env ${onOff(false, !(cfg as { loadProcess?: boolean }).loadProcess)}`,
        )
        .conflicts('loadProcess'),
    );

  // Exclusion master toggle (dynamic)
  p = p
    .addOption(
      program
        .createDynamicOption('-a, --exclude-all', (cfg) => {
          const c = cfg as {
            excludeDynamic?: boolean;
            excludeEnv?: boolean;
            excludeGlobal?: boolean;
            excludePrivate?: boolean;
            excludePublic?: boolean;
          };
          const allOn =
            !!c.excludeDynamic &&
            ((!!c.excludeEnv && !!c.excludeGlobal) ||
              (!!c.excludePrivate && !!c.excludePublic));
          const suffix = allOn ? ' (default)' : '';
          return `exclude all dotenv variables from loading ON${suffix}`;
        })
        .conflicts('excludeAllOff'),
    )
    .addOption(
      new Option(
        '-A, --exclude-all-off',
        `exclude all dotenv variables from loading OFF (default)`,
      ).conflicts('excludeAll'),
    );

  // Per-family exclusions (dynamic defaults)
  p = p
    .addOption(
      program
        .createDynamicOption(
          '-z, --exclude-dynamic',
          (cfg) =>
            `exclude dynamic dotenv variables from loading ${onOff(true, Boolean((cfg as { excludeDynamic?: boolean }).excludeDynamic))}`,
        )
        .conflicts('excludeDynamicOff'),
    )
    .addOption(
      program
        .createDynamicOption(
          '-Z, --exclude-dynamic-off',
          (cfg) =>
            `exclude dynamic dotenv variables from loading ${onOff(false, !(cfg as { excludeDynamic?: boolean }).excludeDynamic)}`,
        )
        .conflicts('excludeDynamic'),
    )
    .addOption(
      program
        .createDynamicOption(
          '-n, --exclude-env',
          (cfg) =>
            `exclude environment-specific dotenv variables from loading ${onOff(true, Boolean((cfg as { excludeEnv?: boolean }).excludeEnv))}`,
        )
        .conflicts('excludeEnvOff'),
    )
    .addOption(
      program
        .createDynamicOption(
          '-N, --exclude-env-off',
          (cfg) =>
            `exclude environment-specific dotenv variables from loading ${onOff(false, !(cfg as { excludeEnv?: boolean }).excludeEnv)}`,
        )
        .conflicts('excludeEnv'),
    )
    .addOption(
      program
        .createDynamicOption(
          '-g, --exclude-global',
          (cfg) =>
            `exclude global dotenv variables from loading ${onOff(true, Boolean((cfg as { excludeGlobal?: boolean }).excludeGlobal))}`,
        )
        .conflicts('excludeGlobalOff'),
    )
    .addOption(
      program
        .createDynamicOption(
          '-G, --exclude-global-off',
          (cfg) =>
            `exclude global dotenv variables from loading ${onOff(false, !(cfg as { excludeGlobal?: boolean }).excludeGlobal)}`,
        )
        .conflicts('excludeGlobal'),
    )
    .addOption(
      program
        .createDynamicOption(
          '-r, --exclude-private',
          (cfg) =>
            `exclude private dotenv variables from loading ${onOff(true, Boolean((cfg as { excludePrivate?: boolean }).excludePrivate))}`,
        )
        .conflicts('excludePrivateOff'),
    )
    .addOption(
      program
        .createDynamicOption(
          '-R, --exclude-private-off',
          (cfg) =>
            `exclude private dotenv variables from loading ${onOff(false, !(cfg as { excludePrivate?: boolean }).excludePrivate)}`,
        )
        .conflicts('excludePrivate'),
    )
    .addOption(
      program
        .createDynamicOption(
          '-u, --exclude-public',
          (cfg) =>
            `exclude public dotenv variables from loading ${onOff(true, Boolean((cfg as { excludePublic?: boolean }).excludePublic))}`,
        )
        .conflicts('excludePublicOff'),
    )
    .addOption(
      program
        .createDynamicOption(
          '-U, --exclude-public-off',
          (cfg) =>
            `exclude public dotenv variables from loading ${onOff(false, !(cfg as { excludePublic?: boolean }).excludePublic)}`,
        )
        .conflicts('excludePublic'),
    );

  // Log ON/OFF (dynamic)
  p = p
    .addOption(
      program
        .createDynamicOption(
          '-l, --log',
          (cfg) =>
            `console log loaded variables ${onOff(true, Boolean((cfg as { log?: boolean }).log))}`,
        )
        .conflicts('logOff'),
    )
    .addOption(
      program
        .createDynamicOption(
          '-L, --log-off',
          (cfg) =>
            `console log loaded variables ${onOff(false, !(cfg as { log?: boolean }).log)}`,
        )
        .conflicts('log'),
    );

  // Capture flag (no default display; static)
  p = p.option(
    '--capture',
    'capture child process stdio for commands (tests/CI)',
  );

  // Core bootstrap/static flags (kept static in help)
  p = p
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

  // Diagnostics / validation / entropy
  p = p
    .option(
      '--trace [keys...]',
      'emit diagnostics for child env composition (optional keys)',
    )
    .option('--strict', 'fail on env validation errors (schema/requiredKeys)');

  p = p
    .addOption(
      program
        .createDynamicOption('--entropy-warn', (cfg) => {
          const warn = (cfg as { warnEntropy?: boolean }).warnEntropy;
          // Default is effectively ON when warnEntropy is true or undefined.
          return `enable entropy warnings${warn === false ? '' : ' (default on)'}`;
        })
        .conflicts('entropyWarnOff'),
    )
    .addOption(
      program
        .createDynamicOption(
          '--entropy-warn-off',
          (cfg) =>
            `disable entropy warnings${(cfg as { warnEntropy?: boolean }).warnEntropy === false ? ' (default)' : ''}`,
        )
        .conflicts('entropyWarn'),
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

  // Restore original methods
  program.addOption = originalAddOption;

  program.option = originalOption as unknown as GetDotenvCli['option'];
  return p;
};
