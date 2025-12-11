import {
  GetDotenvCli,
  resolveCliOptions,
  type RootOptionsShape,
  type ScriptsTable,
  toHelpConfig,
} from '@/src/cliHost';
import { baseRootOptionDefaults } from '@/src/defaults';
import {
  awsPlugin,
  awsWhoamiPlugin,
  batchPlugin,
  cmdPlugin,
  initPlugin,
} from '@/src/plugins';

/**
 * Create a get-dotenv CLI host with included plugins.
 *
 * Options:
 * - alias: command name used for help/argv scaffolding (default: "getdotenv")
 * - branding: optional help header; when omitted, brand() uses "\<alias\> v\<version\>"
 *
 * Usage:
 *   import \{ createCli \} from '\@karmaniverous/get-dotenv';
 *   await createCli(\{ alias: 'getdotenv', branding: 'getdotenv vX.Y.Z' \})
 *     .run(process.argv.slice(2));
 */
export type CreateCliOptions = {
  alias?: string;
  branding?: string;
  /**
   * Optional composer to wire the CLI (plugins/options). If not provided,
   * the shipped default wiring is applied. Any configureOutput/exitOverride
   * you call here override the defaults.
   */
  compose?: (program: GetDotenvCli) => GetDotenvCli;
};

export function createCli(
  opts: CreateCliOptions = {},
): (argv?: string[]) => Promise<void> {
  // Pre-compose aws parent/child to avoid nested call-site typing/lint issues
  const alias =
    typeof opts.alias === 'string' && opts.alias.length > 0
      ? opts.alias
      : 'getdotenv';

  const program: GetDotenvCli = new GetDotenvCli(alias);
  // Default output: normalize help prints so they always end with a blank line.
  // This keeps E2E assertions (CRLF and >=2 trailing newlines) portable across
  // runtimes and capture modes without altering Commander internals.
  const outputCfg = {
    writeOut(str: string) {
      const txt = typeof str === 'string' ? str : '';
      const hasTwo = /(?:\r?\n){2,}$/.test(txt);
      const hasOne = /\r?\n$/.test(txt);
      const out = hasTwo ? txt : hasOne ? txt + '\n' : txt + '\n\n';
      try {
        process.stdout.write(out);
      } catch {
        /* ignore */
      }
    },
    writeErr(str: string) {
      process.stderr.write(str);
    },
  } satisfies {
    writeOut: (str: string) => void;
    writeErr: (str: string) => void;
  };

  // Apply default output on root BEFORE composition so subcommands inherit.
  program.configureOutput(outputCfg);

  // Tests-only: avoid process.exit during help/version flows under Vitest.
  const underTests =
    process.env.GETDOTENV_TEST === '1' ||
    typeof process.env.VITEST_WORKER_ID === 'string';
  const dbg = (...args: unknown[]) => {
    if (process.env.GETDOTENV_DEBUG) {
      try {
        const line = args
          .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
          .join(' ');
        process.stderr.write(`[getdotenv:run] ${line}\n`);
      } catch {
        /* ignore */
      }
    }
  };
  // Pre-install tests-only exitOverride BEFORE composition so compose may override if desired.
  if (underTests) {
    program.exitOverride((err: unknown) => {
      const code = (err as { code?: string } | undefined)?.code;
      // Commander printed help already; ensure a trailing blank line for tests/CI capture.
      if (code === 'commander.helpDisplayed') {
        try {
          process.stdout.write('\n');
        } catch {
          /* ignore */
        }
        return;
      }
      if (code === 'commander.version') {
        return;
      }
      throw err;
    });
  }

  // Root no-op action BEFORE composition so root-only flows trigger hooks;
  // compose() may replace this with its own action.
  program.action(() => {
    /* no-op */
  });

  // Compose wiring: user-provided composer wins; otherwise apply shipped defaults.
  if (typeof opts.compose === 'function') {
    opts.compose(program);
  } else {
    program
      .overrideRootOptions({ loadProcess: false })
      .use(
        cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }),
      )
      .use(batchPlugin())
      .use(awsPlugin().use(awsWhoamiPlugin()))
      .use(initPlugin())
      .passOptions({ loadProcess: false });
  }

  // Runner function: accepts full argv or args-only; defaults to process.argv.
  return async function run(argvInput?: string[]) {
    const argvAll = Array.isArray(argvInput) ? argvInput : process.argv;
    // Derive args-only from a possible full process argv
    const deriveArgsOnly = (v: string[]) => {
      if (v.length >= 2) {
        // Common Node/Electron convention: [node, script, ...args]
        return v.slice(2);
      }
      return v.slice();
    };
    const argv = deriveArgsOnly(argvAll);
    // Ensure plugin commands/options are installed before inspecting argv for
    // help-time routing (subcommand vs root help).
    dbg('argv', argv);
    await program.install();
    // Help handling:
    // - Short-circuit ONLY for true top-level -h/--help (no subcommand before flag).
    // - If a subcommand token appears before -h/--help, defer to Commander
    //   to render that subcommand's help.
    const helpIdx = argv.findIndex((a) => a === '-h' || a === '--help');
    if (helpIdx >= 0) {
      // Build a set of known subcommand names/aliases on the root.
      const subs = new Set<string>();
      for (const c of program.commands) {
        subs.add(c.name());
        for (const a of c.aliases()) subs.add(a);
      }
      dbg('helpIdx', helpIdx, 'knownSubs', Array.from(subs.values()));
      const hasSubBeforeHelp = argv
        .slice(0, helpIdx)
        .some((tok) => subs.has(tok));

      if (!hasSubBeforeHelp) {
        await program.brand({
          name: alias,
          importMetaUrl: import.meta.url,
          description: 'Base CLI.',
          ...(typeof opts.branding === 'string' && opts.branding.length > 0
            ? { helpHeader: opts.branding }
            : {}),
        });
        dbg('top-level -h, render root help');
        // Resolve context once without side effects for help rendering.
        const ctx = await program.resolveAndLoad(
          {
            loadProcess: false,
            log: false,
          },
          { runAfterResolve: false },
        );
        // Build a defaults-only merged CLI bag for help-time parity (no side effects).
        const { merged: defaultsMerged } = resolveCliOptions<
          RootOptionsShape & { scripts?: ScriptsTable }
        >({}, baseRootOptionDefaults as Partial<RootOptionsShape>, undefined);
        const helpCfg = toHelpConfig(defaultsMerged, ctx.pluginConfigs);
        program.evaluateDynamicOptions(helpCfg);
        // Suppress output only during unit tests; allow E2E to capture.
        const piping =
          process.env.GETDOTENV_STDIO === 'pipe' ||
          process.env.GETDOTENV_STDOUT === 'pipe';
        if (!(underTests && !piping)) {
          dbg('outputHelp()');
          program.outputHelp();
        }
        return;
      }
      // Subcommand token exists before -h: fall through to normal parsing,
      // letting Commander print that subcommand's help.
    }
    dbg('parseAsync start');
    await program.brand({
      name: alias,
      importMetaUrl: import.meta.url,
      description: 'Base CLI.',
      ...(typeof opts.branding === 'string' && opts.branding.length > 0
        ? { helpHeader: opts.branding }
        : {}),
    });
    await program.parseAsync(['node', alias, ...argv]);
  };
}
