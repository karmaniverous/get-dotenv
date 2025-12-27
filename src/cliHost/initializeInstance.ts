/** src/cliHost/initializeInstance.ts
 * Helper to initialize a GetDotenvCli instance with help configuration,
 * header injection, and a lazy preSubcommand context resolver.
 * Also installs tests-only exitOverride to suppress process.exit on help/version.
 */
import type { Command, Option } from '@commander-js/extra-typings';

import type { GetDotenvCli } from './GetDotenvCli';
import { GROUP_TAG } from './groups';

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
  // Configure grouped help: show only base options in default "Options";
  // subcommands show all of their own options.
  cli.configureHelp({
    visibleOptions: (cmd: Command): Option[] => {
      const all = cmd.options;
      const isRoot = cmd.parent === null;
      const list = isRoot
        ? all.filter((opt) => {
            const group = GROUP_TAG.get(opt);
            return group === 'base';
          })
        : all.slice();
      // Sort: short-aliased options first, then long-only; stable by flags.
      const hasShort = (opt: Option) => {
        const flags = opt.flags;
        return /(^|\s|,)-[A-Za-z]/.test(flags);
      };
      const byFlags = (opt: Option) => opt.flags;
      list.sort((a, b) => {
        const aS = hasShort(a) ? 1 : 0;
        const bS = hasShort(b) ? 1 : 0;
        return bS - aS || byFlags(a).localeCompare(byFlags(b));
      });
      return list;
    },
  });

  // Optional branded header before help text (kept minimal and deterministic).
  cli.addHelpText('beforeAll', () => {
    const header = headerGetter();
    return header && header.length > 0 ? `${header}\n\n` : '';
  });

  // Tests-only: suppress process.exit during help/version flows under Vitest.
  // Unit tests often construct GetDotenvCli directly (bypassing createCli),
  // so install a local exitOverride when a test environment is detected.
  const underTests =
    process.env.GETDOTENV_TEST === '1' ||
    typeof process.env.VITEST_WORKER_ID === 'string';
  if (underTests) {
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
  // The passOptions() helper, when installed, resolves the final context.
  cli.hook('preSubcommand', async () => {
    if (cli.hasCtx()) return;
    await cli.resolveAndLoad({ loadProcess: false });
  });
}
