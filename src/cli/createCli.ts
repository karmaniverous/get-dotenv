import { GetDotenvCli, type RootOptionsShape } from '@/src/cliHost';
import { attachRootOptions as attachRootOptionsBuilder } from '@/src/cliHost/attachRootOptions';
import { recordRunArgv, runArgvRequestsDebug } from '@/src/cliHost/parseHost';
import { installRootHooks } from '@/src/cliHost/rootHooks';
import {
  configureTopLevelHelp,
  underTestRunner,
} from '@/src/cliHost/topLevelHelp';
import { userArgsOf } from '@/src/cliHost/userArgs';
import { applyRootVisibility } from '@/src/cliHost/visibility';
import {
  awsPlugin,
  awsWhoamiPlugin,
  batchPlugin,
  cmdPlugin,
  initPlugin,
} from '@/src/plugins';
import { readHostPackage } from '@/src/util/packageRoot';

/**
 * Compose the shipped plugins (the `getdotenv` CLI's tree): `cmd` (the
 * default subcommand, with its `-c, --cmd` alias on the root), `batch`,
 * `aws` with its `whoami` child, and `init`.
 *
 * @param program - The host root.
 * @returns The host.
 */
export const composeShippedPlugins = (program: GetDotenvCli): GetDotenvCli =>
  program
    .use(cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }))
    .use(batchPlugin())
    .use(awsPlugin().use(awsWhoamiPlugin()))
    .use(initPlugin());

/**
 * Top-level error boundary for the CLI runner.
 *
 * Presents errors as clean one-line messages by default.
 * When GETDOTENV_DEBUG is set, prints the full stack trace.
 */
function handleCliError(err: unknown, debugArgv: boolean): void {
  const isDebug =
    process.env.GETDOTENV_DEBUG === '1' ||
    process.env.GETDOTENV_DEBUG === 'true' ||
    debugArgv;

  const message = err instanceof Error ? err.message : String(err);

  if (isDebug) {
    console.error(err instanceof Error ? (err.stack ?? message) : message);
  } else {
    console.error(`Error: ${message}`);
  }

  process.exitCode = 1;
}

/**
 * Create a get-dotenv CLI host with included plugins.
 *
 * Options:
 * - importMetaUrl (required): the host module's `import.meta.url`; its package
 *   root is the host root (packaged config, version, description)
 * - alias: command name used for help/argv scaffolding (default: "getdotenv")
 * - branding: optional help header; when omitted, brand() uses "<alias> v<version>"
 *
 * Usage:
 * ```ts
 * import { createCli } from '@karmaniverous/get-dotenv/cli';
 *
 * await createCli({
 *    alias: 'mycli',
 *    importMetaUrl: import.meta.url,
 * })();
 * ```
 */
export type CreateCliOptions = {
  /**
   * The host module's `import.meta.url` (required). The host root is the
   * nearest `package.json` directory above it. It supplies:
   * - the packaged config layer, `<hostRoot>/getdotenv.config.*` (it replaces
   *   get-dotenv's own; when the host root is the project root, the packaged
   *   layer is skipped so the same file isn't applied twice);
   * - the version (`package.json` `version`, unless `version` is given);
   * - the description (`package.json` `description`, unless `description`
   *   is given).
   */
  importMetaUrl: string;
  /**
   * CLI command name used for help and argv scaffolding.
   * Defaults to `'getdotenv'` when omitted.
   */
  alias?: string;
  /**
   * Version printed by `-V, --version` and shown in the default help header.
   * Overrides the host package's `package.json` `version`.
   */
  version?: string;
  /**
   * Root command description shown in help. Overrides the host package's
   * `package.json` `description`.
   */
  description?: string;
  /**
   * Optional help header text. When omitted, brand() uses
   * `"<alias> v<resolved-version>"` if a version can be read.
   */
  branding?: string;
  /**
   * Optional composer to wire the CLI (plugins/options). If not provided,
   * the shipped default wiring is applied. Any `configureOutput`/`exitOverride`
   * you call here override the defaults.
   */
  compose?: (program: GetDotenvCli) => GetDotenvCli;
  /**
   * Host root defaults. They rank above `baseRootOptionDefaults` and below
   * config `rootOptionDefaults`, the parent options bag and CLI flags; they
   * are merge-time defaults (and top-level -h labels), never Commander option
   * defaults.
   * Note: shipped CLI does not force loadProcess OFF; base defaults apply unless set here.
   */
  rootOptionDefaults?: Partial<RootOptionsShape>;
  /**
   * Visibility map to hide families/singles from root help. When a key is false,
   * the corresponding option(s) are hidden (via hideHelp) after flags are declared.
   * Config `rootOptionVisibility` ranks above it, so a config `true` shows a
   * flag this map hides.
   */
  rootOptionVisibility?: Partial<Record<keyof RootOptionsShape, boolean>>;
};

/**
 * Create a configured get-dotenv CLI host.
 * Applies defaults, installs root hooks, and composes plugins.
 * Returns a runner function that accepts an argv array.
 *
 * The runner's argv is the user arguments only, as in
 * `run(['-e', 'dev', 'cmd', 'npm', 'test'])`, unless its second parameter
 * gives Commander's `from`: `run(process.argv, { from: 'node' })` drops the
 * first two entries. Called without an argv it reads `process.argv` and
 * detects the convention as Commander does (`node -e`/`-p`, Electron).
 *
 * @param opts - Host options; `importMetaUrl` is required.
 * @returns The runner. It takes an optional argv and optional parse options
 *   (`from`), and may be called more than once.
 * @throws When `importMetaUrl` is missing or empty.
 */
export function createCli(
  opts: CreateCliOptions,
): (
  argv?: string[],
  options?: { from?: 'node' | 'electron' | 'user' },
) => Promise<void> {
  const importMetaUrl = (opts as Partial<CreateCliOptions> | undefined)
    ?.importMetaUrl;
  if (typeof importMetaUrl !== 'string' || importMetaUrl.length === 0) {
    throw new Error(
      'createCli requires importMetaUrl: pass createCli({ importMetaUrl: import.meta.url, ... }) so the host CLI reports its own package (packaged config, version, description).',
    );
  }
  const alias =
    typeof opts.alias === 'string' && opts.alias.length > 0
      ? opts.alias
      : 'getdotenv';

  const program: GetDotenvCli = new GetDotenvCli(alias, { importMetaUrl });
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

  // Root defaults/visibility for this host (applied once, pre-compose).
  const rootDefaults: Partial<RootOptionsShape> = opts.rootOptionDefaults ?? {};
  const visibility = opts.rootOptionVisibility ?? {};

  // Tests-only: avoid process.exit during help/version flows under Vitest.
  const underTests = underTestRunner();
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

  // Declare root flags and resolution hooks once, pre-compose.
  // 1) Declare flags using the internal builder (no public helper).
  attachRootOptionsBuilder(program, rootDefaults);
  // 2) Install resolution hooks (preSubcommand/preAction).
  installRootHooks(program, rootDefaults);
  // Top-level help (rendered by parseAsync) uses the same defaults.
  configureTopLevelHelp(program, { rootDefaults, visibility });
  // Apply visibility (hide selected options) after flags are declared.
  if (Object.keys(visibility).length > 0) {
    applyRootVisibility(program, visibility);
  }

  // Compose wiring: user-provided composer wins; otherwise apply shipped defaults.
  if (typeof opts.compose === 'function') opts.compose(program);
  else composeShippedPlugins(program);

  // Host identity (Decision 23): name, description and version from the
  // host package unless overridden. The constructor set the host root, so
  // brand() gets no URL (it would re-read the same package.json). Runs after
  // install() on every run; brand() registers -V, --version only once (#87).
  const brandHost = async () => {
    const pkg = await readHostPackage(importMetaUrl);
    const version = opts.version ?? pkg?.version;
    const description = opts.description ?? pkg?.description;
    await program.brand({
      name: alias,
      ...(version !== undefined ? { version } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(typeof opts.branding === 'string' && opts.branding.length > 0
        ? { helpHeader: opts.branding }
        : {}),
    });
  };

  // Brand, then parseAsync: install, table, normalization, top-level help
  // and the parse (spec 4.4).
  const runArgs = async (argv: string[]) => {
    dbg('argv', argv);
    recordRunArgv(program, argv, false);
    await brandHost();
    await program.parseAsync(argv, { from: 'user' });
  };

  // Runner: an explicit argv is user arguments only unless `from` says
  // otherwise (#53); no argv reads process.argv as Commander does.
  return async function run(
    argvInput?: string[],
    options?: { from?: 'node' | 'electron' | 'user' },
  ) {
    const argv = userArgsOf(argvInput, {
      from: options?.from ?? (argvInput === undefined ? undefined : 'user'),
    });
    // The error boundary covers the whole run (#62).
    try {
      await runArgs(argv);
    } catch (err: unknown) {
      handleCliError(err, runArgvRequestsDebug(program));
    }
  };
}
