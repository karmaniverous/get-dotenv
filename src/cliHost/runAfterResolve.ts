/** src/cliHost/runAfterResolve.ts
 * Run afterResolve hooks for a plugin tree (parent → children).
 */
import type { GetDotenvOptions } from '@/src/GetDotenvOptions';

import type { GetDotenvCliPublic } from './definePlugin';
import type { GetDotenvCliPlugin } from './definePlugin';
import type { GetDotenvCliCtx } from './GetDotEnvCli';

export async function runAfterResolveTree<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
>(
  cli: GetDotenvCliPublic<TOptions>,
  plugins: GetDotenvCliPlugin<TOptions>[],
  ctx: GetDotenvCliCtx<TOptions>,
): Promise<void> {
  const run = async (p: GetDotenvCliPlugin<TOptions>) => {
    if (p.afterResolve) await p.afterResolve(cli, ctx);
    for (const child of p.children) await run(child);
  };
  for (const p of plugins) await run(p);
}
