/** src/cliHost/runAfterResolve.ts
 * Run afterResolve hooks for a plugin tree (parent → children).
 */
import type { OptionValues } from '@commander-js/extra-typings';

import type { GetDotenvOptions } from '@/src/GetDotenvOptions';

import type { GetDotenvCliPublic } from './definePlugin';
import type { GetDotenvCliPlugin } from './definePlugin';
import type { GetDotenvCliCtx } from './GetDotenvCli';

export async function runAfterResolveTree<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
>(
  cli: GetDotenvCliPublic<TOptions, TArgs, TOpts, TGlobal>,
  plugins: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>[],
  ctx: GetDotenvCliCtx<TOptions>,
): Promise<void> {
  const run = async (
    p: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>,
  ) => {
    if (p.afterResolve) await p.afterResolve(cli, ctx);
    for (const child of p.children) await run(child.plugin);
  };
  for (const p of plugins) await run(p);
}
