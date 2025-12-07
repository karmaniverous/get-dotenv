/** src/cliHost/registerPlugin.ts
 * Install a plugin and its children (setup phase), pre-order.
 */
import type { GetDotenvOptions } from '@/src/GetDotenvOptions';

import type { GetDotenvCliPublic } from './definePlugin';
import type { GetDotenvCliPlugin } from './definePlugin';

export function setupPluginTree<TOptions extends GetDotenvOptions>(
  cli: GetDotenvCliPublic<TOptions>,
  plugin: GetDotenvCliPlugin<TOptions>,
): void {
  const setupOne = (p: GetDotenvCliPlugin<TOptions>) => {
    const maybe = p.setup(cli);
    // Registration-only setup may be async; ignore completion.
    void maybe;
    for (const child of p.children) setupOne(child);
  };
  setupOne(plugin);
}
