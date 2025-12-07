/** src/cliHost/GetDotenvCli/dynamicOptions.ts
 * Helpers for dynamic option descriptions and evaluation.
 */
import type { CommandUnknownOpts, Option } from '@commander-js/extra-typings';
import { Option as CommanderOption } from '@commander-js/extra-typings';

import type { GetDotenvCliOptions } from '@/src/cliHost/GetDotenvCliOptions';

export type ResolvedHelpConfigLite = Partial<GetDotenvCliOptions> & {
  plugins: Record<string, unknown>;
};

// Registry for dynamic descriptions keyed by Option (WeakMap so GC-friendly)
export const DYN_DESC = new WeakMap<
  Option,
  (cfg: ResolvedHelpConfigLite) => string
>();

/**
 * Create an Option with a dynamic description callback stored in DYN_DESC.
 */
export function makeDynamicOption(
  flags: string,
  desc: (cfg: ResolvedHelpConfigLite) => string,
  parser?: (value: string, previous?: unknown) => unknown,
  defaultValue?: unknown,
): Option {
  const opt = new CommanderOption(flags, '');
  DYN_DESC.set(opt, desc);
  if (parser) {
    opt.argParser((value, previous) => parser(value, previous));
  }
  if (defaultValue !== undefined) opt.default(defaultValue);
  return opt;
}

/**
 * Evaluate dynamic descriptions across a command tree using the resolved config.
 */
export function evaluateDynamicOptions(
  root: CommandUnknownOpts,
  resolved: ResolvedHelpConfigLite,
): void {
  const visit = (cmd: CommandUnknownOpts) => {
    const arr = cmd.options;
    for (const o of arr) {
      const dyn = DYN_DESC.get(o);
      if (typeof dyn === 'function') {
        try {
          const txt = dyn(resolved);
          // Commander uses Option.description during help rendering.
          (o as { description?: string }).description = txt;
        } catch {
          /* best-effort; leave as-is */
        }
      }
    }
    for (const c of cmd.commands) visit(c);
  };
  visit(root);
}
