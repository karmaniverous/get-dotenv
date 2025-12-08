/** src/cliHost/registerPlugin.ts
 * Install a plugin and its children (setup phase), pre-order.
 */
import type { OptionValues } from '@commander-js/extra-typings';

import type { GetDotenvOptions } from '@/src/GetDotenvOptions';

import type { GetDotenvCliPublic } from './definePlugin';
import type { GetDotenvCliPlugin } from './definePlugin';

export function setupPluginTree<
  TOptions extends GetDotenvOptions,
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
>(
  cli: GetDotenvCliPublic<TOptions, TArgs, TOpts, TGlobal>,
  plugin: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>,
): void {
  const setupOne = (p: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>) => {
    const maybe = p.setup(cli);
    // Registration-only setup may be async; ignore completion.
    void maybe;
    for (const child of p.children) {
      setupOne(child);
    }
  };
  setupOne(plugin);
}
