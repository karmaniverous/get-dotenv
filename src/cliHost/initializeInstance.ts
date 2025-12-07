/** src/cliHost/initializeInstance.ts
 * Helper to initialize a GetDotenvCli instance with help configuration,
 * header injection, and a lazy preSubcommand context resolver.
 */
import type { Command, Option } from 'commander';

import type { GetDotenvCli } from './GetDotEnvCli';
import { GROUP_TAG } from './groups';

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

  // PreSubcommand hook: compute a context if absent, without mutating process.env.
  // The passOptions() helper, when installed, resolves the final context.
  cli.hook('preSubcommand', async () => {
    if (cli.hasCtx()) return;
    await cli.resolveAndLoad({ loadProcess: false });
  });
}
