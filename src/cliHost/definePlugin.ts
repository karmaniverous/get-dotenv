// Optional per-plugin config validation (host validates when loader is enabled).
import type { ZodTypeAny } from 'zod';

import type { GetDotenvCli, GetDotenvCliCtx } from './GetDotenvCli';

/** Public plugin contract used by the GetDotenv CLI host. */
export interface GetDotenvCliPlugin {
  id?: string /**
   * Setup phase: register commands and wiring on the provided CLI instance.   * Runs parent → children (pre-order).
   */;
  setup: (cli: GetDotenvCli) => void | Promise<void>;
  /**
   * After the dotenv context is resolved, initialize any clients/secrets
   * or attach per-plugin state under ctx.plugins (by convention).
   * Runs parent → children (pre-order).
   */
  afterResolve?: (
    cli: GetDotenvCli,
    ctx: GetDotenvCliCtx,
  ) => void | Promise<void>;
  /**
   * Optional Zod schema for this plugin's config slice (from config.plugins[id]).
   * When provided, the host validates the merged config under the guarded loader path.
   */
  configSchema?: ZodTypeAny;
  /**
   * Compositional children. Installed after the parent per pre-order.
   */
  children: GetDotenvCliPlugin[];
  /**
   * Compose a child plugin. Returns the parent to enable chaining.
   */
  use: (child: GetDotenvCliPlugin) => GetDotenvCliPlugin;
}

/**
 * Public spec type for defining a plugin with optional children.
 * Exported to ensure TypeDoc links and navigation resolve correctly.
 */
export type DefineSpec = Omit<GetDotenvCliPlugin, 'children' | 'use'> & {
  children?: GetDotenvCliPlugin[];
};
/**
 * Define a GetDotenv CLI plugin with compositional helpers.
 *
 * @example
 * const parent = definePlugin(\{ id: 'p', setup(cli) \{ /* ... *\/ \} \})
 *   .use(childA)
 *   .use(childB);
 */
export const definePlugin = (spec: DefineSpec): GetDotenvCliPlugin => {
  const { children = [], ...rest } = spec;
  const plugin: GetDotenvCliPlugin = {
    ...rest,
    children: [...children],
    use(child) {
      this.children.push(child);
      return this;
    },
  };
  return plugin;
};
