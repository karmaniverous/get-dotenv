/** src/cliHost/initializeInstance.ts
 * Helper to initialize a GetDotenvCli instance with help configuration,
 * header injection, and a lazy preSubcommand context resolver.
 * Also installs tests-only exitOverride to suppress process.exit on help/version.
 */
import type { GetDotenvCli } from './GetDotenvCli';
import { configureHostHelp } from './hostHelp';
import { hasRootHooks } from './rootHooksState';
import { underTestRunner } from './underTestRunner';

/**
 * Initialize a {@link GetDotenvCli} instance with help configuration and safe defaults.
 *
 * @remarks
 * This is a low-level initializer used by the host constructor to keep `GetDotenvCli.ts`
 * small and to centralize help/output behavior.
 *
 * @param cli - The CLI instance to initialize.
 * @param headerGetter - Callback returning an optional help header string.
 */
export function initializeInstance(
  cli: GetDotenvCli,
  headerGetter: () => string | undefined,
): void {
  // Host help (spec 4.6): grouped sections, qualified names, inherited
  // sections, hidden options skipped. parseAsync gives every command in the
  // tree the same settings, plain new Command() mounts included.
  configureHostHelp(cli);

  // Optional branded header before help text (kept minimal and deterministic).
  cli.addHelpText('beforeAll', () => {
    const header = headerGetter();
    return header && header.length > 0 ? `${header}\n\n` : '';
  });

  // Tests-only: suppress process.exit during help/version flows under Vitest.
  // Unit tests often construct GetDotenvCli directly (bypassing createCli),
  // so install a local exitOverride when a test environment is detected.
  if (underTestRunner()) {
    cli.exitOverride((err: unknown) => {
      const code = (err as { code?: string } | undefined)?.code;
      if (
        code === 'commander.helpDisplayed' ||
        code === 'commander.version' ||
        code === 'commander.help'
      )
        return;
      throw err as Error;
    });
  }
  // Ensure the root has a no-op action so preAction hooks installed by
  // passOptions() fire for root-only invocations (no subcommand).
  // Subcommands still take precedence and will not hit this action.
  // This keeps root-side effects (e.g., --log) working in direct hosts/tests.
  cli.action(() => {
    /* no-op */
  });
  // PreSubcommand hook: compute a context if absent, without mutating process.env.
  // Bare hosts only: when the root hooks are installed they compose the
  // run's one context, so this resolver stands down.
  cli.hook('preSubcommand', async () => {
    if (hasRootHooks(cli) || cli.hasCtx()) return;
    await cli.resolveAndLoad(
      { loadProcess: false },
      { runAfterResolve: false },
    );
  });
}
