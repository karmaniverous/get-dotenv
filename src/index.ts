import { GetDotenvCli } from './cliHost';
import type { ResolvedHelpConfig } from './cliHost/GetDotenvCli';
import { awsPlugin } from './plugins/aws';
import { batchPlugin } from './plugins/batch';
import { cmdPlugin } from './plugins/cmd';
import { demoPlugin } from './plugins/demo';
import { initPlugin } from './plugins/init';

export { buildSpawnEnv } from './cliCore/spawnEnv';
export {
  dotenvExpand,
  dotenvExpandAll,
  dotenvExpandFromProcessEnv,
} from './dotenvExpand';
export { getDotenv } from './getDotenv';
export {
  defineDynamic,
  getDotenvCliOptions2Options,
  type GetDotenvDynamic,
  type GetDotenvOptions,
  type ProcessEnv,
} from './GetDotenvOptions';
export { interpolateDeep } from './util/interpolateDeep';

/**
 * Create a get-dotenv CLI host with included plugins.
 *
 * Options:
 * - alias: command name used for help/argv scaffolding (default: "getdotenv")
 * - branding: optional help header; when omitted, brand() uses "<alias> v<version>"
 *
 * Usage:
 *   import \{ createCli \} from '\@karmaniverous/get-dotenv';
 *   await createCli(\{ alias: 'getdotenv', branding: 'getdotenv vX.Y.Z' \})
 *     .run(process.argv.slice(2));
 */
export type CreateCliOptions = {
  alias?: string;
  branding?: string;
};

export function createCli(opts: CreateCliOptions = {}): {
  run: (argv: string[]) => Promise<void>;
} {
  const alias =
    typeof opts.alias === 'string' && opts.alias.length > 0
      ? opts.alias
      : 'getdotenv';

  const program: GetDotenvCli = new GetDotenvCli(alias);
  // Normalize Commander output so help prints always end with a blank line.
  // This keeps E2E assertions (CRLF and >=2 trailing newlines) portable across
  // runtimes and capture modes without altering Commander internals.
  program.configureOutput({
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
    writeErr: (str: string) => process.stderr.write(str),
  });
  // Install base root flags and included plugins; resolve context once per run.
  program
    .attachRootOptions({ loadProcess: false })
    .use(cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }))
    .use(batchPlugin())
    .use(awsPlugin())
    .use(demoPlugin())
    .use(initPlugin())
    .passOptions({ loadProcess: false });

  // Tests-only: avoid process.exit during help/version flows under Vitest.
  const underTests =
    process.env.GETDOTENV_TEST === '1' ||
    typeof process.env.VITEST_WORKER_ID === 'string';
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

  return {
    async run(argv: string[]) {
      // Help handling:
      // - Short-circuit ONLY for true top-level -h/--help (no subcommand before flag).
      // - If a subcommand token appears before -h/--help, defer to Commander
      //   to render that subcommand's help.
      const helpIdx = argv.findIndex((a) => a === '-h' || a === '--help');
      if (helpIdx >= 0) {
        // Build a set of known subcommand names/aliases on the root.
        const subs = new Set<string>();
        const cmds =
          (
            program as unknown as {
              commands?: Array<{ name(): string; aliases(): string[] }>;
            }
          ).commands ?? [];
        for (const c of cmds) {
          subs.add(c.name());
          for (const a of c.aliases()) subs.add(a);
        }
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
          // Resolve context once without side effects for help rendering.
          const ctx = await program.resolveAndLoad(
            {
              loadProcess: false,
              log: false,
            },
            { runAfterResolve: false },
          );
          (program as unknown as GetDotenvCli).evaluateDynamicOptions({
            ...(ctx.optionsResolved as unknown as Record<string, unknown>),
            plugins: ctx.pluginConfigs ?? {},
          } as unknown as ResolvedHelpConfig);
          // Suppress output only during unit tests; allow E2E to capture.
          const piping =
            process.env.GETDOTENV_STDIO === 'pipe' ||
            process.env.GETDOTENV_STDOUT === 'pipe';
          if (underTests && !piping) {
            void program.helpInformation();
          } else {
            program.outputHelp();
          }
          return;
        }
        // Subcommand token exists before -h: fall through to normal parsing,
        // letting Commander print that subcommand's help.
      }
      await program.brand({
        name: alias,
        importMetaUrl: import.meta.url,
        description: 'Base CLI.',
        ...(typeof opts.branding === 'string' && opts.branding.length > 0
          ? { helpHeader: opts.branding }
          : {}),
      });
      await program.parseAsync(['node', alias, ...argv]);
    },
  };
}
