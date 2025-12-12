import { Option } from '@commander-js/extra-typings';

import { dotenvExpandFromProcessEnv } from '@/src/dotenv';

import type { GetDotenvCli } from './GetDotenvCli';
import type { RootOptionsShape } from './types';

/**
 * Attach root flags to a GetDotenvCli instance.
 * - Host-only: program is typed as GetDotenvCli and supports dynamicOption/createDynamicOption.
 * - Any flag that displays an effective default in help uses dynamic descriptions.
 */
export const attachRootOptions = (
  program: GetDotenvCli,
  defaults?: Partial<RootOptionsShape>,
) => {
  const GROUP = 'base';

  const {
    defaultEnv,
    dotenvToken,
    dynamicPath,
    env,
    outputPath,
    paths,
    pathsDelimiter,
    pathsDelimiterPattern,
    privateToken,
    scripts,
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

  program.enablePositionalOptions().passThroughOptions();

  // -e, --env <string>
  {
    const opt = new Option(
      '-e, --env <string>',
      'target environment (dotenv-expanded)',
    );
    opt.argParser(dotenvExpandFromProcessEnv);
    if (env !== undefined) opt.default(env);
    program.addOption(opt);
    program.setOptionGroup(opt, GROUP);
  }

  // -v, --vars <string>
  {
    const examples = [
      ['KEY1', 'VAL1'],
      ['KEY2', 'VAL2'],
    ]
      .map((v) => v.join(va))
      .join(vd);
    const opt = new Option(
      '-v, --vars <string>',
      `extra variables expressed as delimited key-value pairs (dotenv-expanded): ${examples}`,
    );
    opt.argParser(dotenvExpandFromProcessEnv);
    program.addOption(opt);
    program.setOptionGroup(opt, GROUP);
  }

  // Output path (interpolated later; help can remain static)
  {
    const opt = new Option(
      '-o, --output-path <string>',
      'consolidated output file  (dotenv-expanded)',
    );
    opt.argParser(dotenvExpandFromProcessEnv);
    if (outputPath !== undefined) opt.default(outputPath);
    program.addOption(opt);
    program.setOptionGroup(opt, GROUP);
  }

  // Shell ON (string or boolean true => default shell)
  {
    const opt = program
      .createDynamicOption('-s, --shell [string]', (cfg) => {
        const s = cfg.shell;
        let tag = '';
        if (typeof s === 'boolean' && s) tag = ' (default OS shell)';
        else if (typeof s === 'string' && s.length > 0) tag = ` (default ${s})`;
        return `command execution shell, no argument for default OS shell or provide shell string${tag}`;
      })
      .conflicts('shellOff');
    program.addOption(opt);
    program.setOptionGroup(opt, GROUP);
  }
  // Shell OFF
  {
    const opt = program
      .createDynamicOption('-S, --shell-off', (cfg) => {
        const s = cfg.shell;
        return `command execution shell OFF${s === false ? ' (default)' : ''}`;
      })
      .conflicts('shell');
    program.addOption(opt);
    program.setOptionGroup(opt, GROUP);
  }

  // Load process ON/OFF (dynamic defaults)
  {
    const optOn = program
      .createDynamicOption(
        '-p, --load-process',
        (cfg) =>
          `load variables to process.env ${onOff(true, Boolean(cfg.loadProcess))}`,
      )
      .conflicts('loadProcessOff');
    program.addOption(optOn);
    program.setOptionGroup(optOn, GROUP);

    const optOff = program
      .createDynamicOption(
        '-P, --load-process-off',
        (cfg) =>
          `load variables to process.env ${onOff(false, !cfg.loadProcess)}`,
      )
      .conflicts('loadProcess');
    program.addOption(optOff);
    program.setOptionGroup(optOff, GROUP);
  }

  // Exclusion master toggle (dynamic)
  {
    const optAll = program
      .createDynamicOption('-a, --exclude-all', (cfg) => {
        const allOn =
          !!cfg.excludeDynamic &&
          ((!!cfg.excludeEnv && !!cfg.excludeGlobal) ||
            (!!cfg.excludePrivate && !!cfg.excludePublic));
        const suffix = allOn ? ' (default)' : '';
        return `exclude all dotenv variables from loading ON${suffix}`;
      })
      .conflicts('excludeAllOff');
    program.addOption(optAll);
    program.setOptionGroup(optAll, GROUP);

    const optAllOff = new Option(
      '-A, --exclude-all-off',
      'exclude all dotenv variables from loading OFF (default)',
    ).conflicts('excludeAll');
    program.addOption(optAllOff);
    program.setOptionGroup(optAllOff, GROUP);
  }

  // Per-family exclusions (dynamic defaults)
  {
    const o1 = program
      .createDynamicOption(
        '-z, --exclude-dynamic',
        (cfg) =>
          `exclude dynamic dotenv variables from loading ${onOff(true, Boolean(cfg.excludeDynamic))}`,
      )
      .conflicts('excludeDynamicOff');
    program.addOption(o1);
    program.setOptionGroup(o1, GROUP);
    const o2 = program
      .createDynamicOption(
        '-Z, --exclude-dynamic-off',
        (cfg) =>
          `exclude dynamic dotenv variables from loading ${onOff(false, !cfg.excludeDynamic)}`,
      )
      .conflicts('excludeDynamic');
    program.addOption(o2);
    program.setOptionGroup(o2, GROUP);
  }
  {
    const o1 = program
      .createDynamicOption(
        '-n, --exclude-env',
        (cfg) =>
          `exclude environment-specific dotenv variables from loading ${onOff(true, Boolean(cfg.excludeEnv))}`,
      )
      .conflicts('excludeEnvOff');
    program.addOption(o1);
    program.setOptionGroup(o1, GROUP);
    const o2 = program
      .createDynamicOption(
        '-N, --exclude-env-off',
        (cfg) =>
          `exclude environment-specific dotenv variables from loading ${onOff(false, !cfg.excludeEnv)}`,
      )
      .conflicts('excludeEnv');
    program.addOption(o2);
    program.setOptionGroup(o2, GROUP);
  }
  {
    const o1 = program
      .createDynamicOption(
        '-g, --exclude-global',
        (cfg) =>
          `exclude global dotenv variables from loading ${onOff(true, Boolean(cfg.excludeGlobal))}`,
      )
      .conflicts('excludeGlobalOff');
    program.addOption(o1);
    program.setOptionGroup(o1, GROUP);
    const o2 = program
      .createDynamicOption(
        '-G, --exclude-global-off',
        (cfg) =>
          `exclude global dotenv variables from loading ${onOff(false, !cfg.excludeGlobal)}`,
      )
      .conflicts('excludeGlobal');
    program.addOption(o2);
    program.setOptionGroup(o2, GROUP);
  }
  {
    const p1 = program
      .createDynamicOption(
        '-r, --exclude-private',
        (cfg) =>
          `exclude private dotenv variables from loading ${onOff(true, Boolean(cfg.excludePrivate))}`,
      )
      .conflicts('excludePrivateOff');
    program.addOption(p1);
    program.setOptionGroup(p1, GROUP);
    const p2 = program
      .createDynamicOption(
        '-R, --exclude-private-off',
        (cfg) =>
          `exclude private dotenv variables from loading ${onOff(false, !cfg.excludePrivate)}`,
      )
      .conflicts('excludePrivate');
    program.addOption(p2);
    program.setOptionGroup(p2, GROUP);
    const pu1 = program
      .createDynamicOption(
        '-u, --exclude-public',
        (cfg) =>
          `exclude public dotenv variables from loading ${onOff(true, Boolean(cfg.excludePublic))}`,
      )
      .conflicts('excludePublicOff');
    program.addOption(pu1);
    program.setOptionGroup(pu1, GROUP);
    const pu2 = program
      .createDynamicOption(
        '-U, --exclude-public-off',
        (cfg) =>
          `exclude public dotenv variables from loading ${onOff(false, !cfg.excludePublic)}`,
      )
      .conflicts('excludePublic');
    program.addOption(pu2);
    program.setOptionGroup(pu2, GROUP);
  }

  // Log ON/OFF (dynamic)
  {
    const lo = program
      .createDynamicOption(
        '-l, --log',
        (cfg) =>
          `console log loaded variables ${onOff(true, Boolean(cfg.log))}`,
      )
      .conflicts('logOff');
    program.addOption(lo);
    program.setOptionGroup(lo, GROUP);
    const lf = program
      .createDynamicOption(
        '-L, --log-off',
        (cfg) => `console log loaded variables ${onOff(false, !cfg.log)}`,
      )
      .conflicts('log');
    program.addOption(lf);
    program.setOptionGroup(lf, GROUP);
  }

  // Capture flag (no default display; static)
  {
    const opt = new Option(
      '--capture',
      'capture child process stdio for commands (tests/CI)',
    );
    program.addOption(opt);
    program.setOptionGroup(opt, GROUP);
  }

  // Core bootstrap/static flags (kept static in help)
  {
    const o1 = new Option(
      '--default-env <string>',
      'default target environment',
    );
    o1.argParser(dotenvExpandFromProcessEnv);
    if (defaultEnv !== undefined) o1.default(defaultEnv);
    program.addOption(o1);
    program.setOptionGroup(o1, GROUP);

    const o2 = new Option(
      '--dotenv-token <string>',
      'dotenv-expanded token indicating a dotenv file',
    );
    o2.argParser(dotenvExpandFromProcessEnv);
    if (dotenvToken !== undefined) o2.default(dotenvToken);
    program.addOption(o2);
    program.setOptionGroup(o2, GROUP);

    const o3 = new Option(
      '--dynamic-path <string>',
      'dynamic variables path (.js or .ts; .ts is auto-compiled when esbuild is available, otherwise precompile)',
    );
    o3.argParser(dotenvExpandFromProcessEnv);
    if (dynamicPath !== undefined) o3.default(dynamicPath);
    program.addOption(o3);
    program.setOptionGroup(o3, GROUP);

    const o4 = new Option(
      '--paths <string>',
      'dotenv-expanded delimited list of paths to dotenv directory',
    );
    o4.argParser(dotenvExpandFromProcessEnv);
    if (paths !== undefined) o4.default(paths);
    program.addOption(o4);
    program.setOptionGroup(o4, GROUP);

    const o5 = new Option(
      '--paths-delimiter <string>',
      'paths delimiter string',
    );
    if (pathsDelimiter !== undefined) o5.default(pathsDelimiter);
    program.addOption(o5);
    program.setOptionGroup(o5, GROUP);

    const o6 = new Option(
      '--paths-delimiter-pattern <string>',
      'paths delimiter regex pattern',
    );
    if (pathsDelimiterPattern !== undefined) o6.default(pathsDelimiterPattern);
    program.addOption(o6);
    program.setOptionGroup(o6, GROUP);

    const o7 = new Option(
      '--private-token <string>',
      'dotenv-expanded token indicating private variables',
    );
    o7.argParser(dotenvExpandFromProcessEnv);
    if (privateToken !== undefined) o7.default(privateToken);
    program.addOption(o7);
    program.setOptionGroup(o7, GROUP);

    const o8 = new Option('--vars-delimiter <string>', 'vars delimiter string');
    if (varsDelimiter !== undefined) o8.default(varsDelimiter);
    program.addOption(o8);
    program.setOptionGroup(o8, GROUP);

    const o9 = new Option(
      '--vars-delimiter-pattern <string>',
      'vars delimiter regex pattern',
    );
    if (varsDelimiterPattern !== undefined) o9.default(varsDelimiterPattern);
    program.addOption(o9);
    program.setOptionGroup(o9, GROUP);

    const o10 = new Option(
      '--vars-assignor <string>',
      'vars assignment operator string',
    );
    if (varsAssignor !== undefined) o10.default(varsAssignor);
    program.addOption(o10);
    program.setOptionGroup(o10, GROUP);

    const o11 = new Option(
      '--vars-assignor-pattern <string>',
      'vars assignment operator regex pattern',
    );
    if (varsAssignorPattern !== undefined) o11.default(varsAssignorPattern);
    program.addOption(o11);
    program.setOptionGroup(o11, GROUP);

    const hidden = new Option('--scripts <string>')
      .default(JSON.stringify(scripts))
      .hideHelp();
    program.addOption(hidden);
    program.setOptionGroup(hidden, GROUP);
  }

  // Diagnostics / validation / entropy
  {
    const tr = new Option(
      '--trace [keys...]',
      'emit diagnostics for child env composition (optional keys)',
    );
    program.addOption(tr);
    program.setOptionGroup(tr, GROUP);
    const st = new Option(
      '--strict',
      'fail on env validation errors (schema/requiredKeys)',
    );
    program.addOption(st);
    program.setOptionGroup(st, GROUP);
  }

  {
    const w = program
      .createDynamicOption('--entropy-warn', (cfg) => {
        const warn = cfg.warnEntropy;
        // Default is effectively ON when warnEntropy is true or undefined.
        return `enable entropy warnings${warn === false ? '' : ' (default on)'}`;
      })
      .conflicts('entropyWarnOff');
    program.addOption(w);
    program.setOptionGroup(w, GROUP);

    const woff = program
      .createDynamicOption(
        '--entropy-warn-off',
        (cfg) =>
          `disable entropy warnings${cfg.warnEntropy === false ? ' (default)' : ''}`,
      )
      .conflicts('entropyWarn');
    program.addOption(woff);
    program.setOptionGroup(woff, GROUP);

    const th = new Option(
      '--entropy-threshold <number>',
      'entropy bits/char threshold (default 3.8)',
    );
    program.addOption(th);
    program.setOptionGroup(th, GROUP);
    const ml = new Option(
      '--entropy-min-length <number>',
      'min length to examine for entropy (default 16)',
    );
    program.addOption(ml);
    program.setOptionGroup(ml, GROUP);
    const wl = new Option(
      '--entropy-whitelist <pattern...>',
      'suppress entropy warnings when key matches any regex pattern',
    );
    program.addOption(wl);
    program.setOptionGroup(wl, GROUP);
    const rp = new Option(
      '--redact-pattern <pattern...>',
      'additional key-match regex patterns to trigger redaction',
    );
    program.addOption(rp);
    program.setOptionGroup(rp, GROUP);
    // Redact ON/OFF (dynamic)
    {
      const rOn = program
        .createDynamicOption(
          '--redact',
          (cfg) =>
            `presentation-time redaction for secret-like keys ON${cfg.redact ? ' (default)' : ''}`,
        )
        .conflicts('redactOff');
      program.addOption(rOn);
      program.setOptionGroup(rOn, GROUP);
      const rOff = program
        .createDynamicOption(
          '--redact-off',
          (cfg) =>
            `presentation-time redaction for secret-like keys OFF${cfg.redact === false ? ' (default)' : ''}`,
        )
        .conflicts('redact');
      program.addOption(rOff);
      program.setOptionGroup(rOff, GROUP);
    }
  }

  return program;
};
