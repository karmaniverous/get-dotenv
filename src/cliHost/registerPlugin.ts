/** src/cliHost/registerPlugin.ts
 * Install a plugin and its children (setup phase), pre-order.
 */
import type { OptionValues } from '@commander-js/extra-typings';

import type { GetDotenvOptions } from '@/src/GetDotenvOptions';

import type { GetDotenvCliPublic } from './definePlugin';
import type { GetDotenvCliPlugin } from './definePlugin';

// Existential CLI public alias for installer-only use. Keeps recursive Commander
// generics contained and avoids leaking specific Args/Opts/Global types.
type AnyCliPublic<TOptions extends GetDotenvOptions> = GetDotenvCliPublic<
  TOptions,
  unknown[],
  OptionValues,
  OptionValues
>;

const isCliPublic = <TOptions extends GetDotenvOptions>(
  v: unknown,
): v is AnyCliPublic<TOptions> => {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o['command'] === 'function' && typeof o['addCommand'] === 'function'
  );
};

const isPromise = (x: unknown): x is Promise<unknown> =>
  typeof x === 'object' && x !== null && 'then' in x;

export function setupPluginTree<
  TOptions extends GetDotenvOptions,
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
>(
  cli: GetDotenvCliPublic<TOptions, TArgs, TOpts, TGlobal>,
  plugin: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>,
): Promise<void> {
  const setupOne = async (
    p: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>,
    currentCli: AnyCliPublic<TOptions>,
  ): Promise<void> => {
    // Call setup through an installer-local typed view to keep existential typing contained.
    const out = (
      p.setup as (cli: AnyCliPublic<TOptions>) => unknown | Promise<unknown>
    )(currentCli);
    const mount = isPromise(out) ? await out : out;
    const childCli = isCliPublic<TOptions>(mount) ? mount : currentCli;
    for (const child of p.children) {
      await setupOne(child, childCli);
    }
  };
  // Kick off install and return the Promise (callers may ignore).
  return setupOne(plugin, cli as unknown as AnyCliPublic<TOptions>);
}
