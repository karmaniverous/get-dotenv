import type { GetDotenvCli, GetDotenvCliCtx } from './GetDotenvCli';

export interface GetDotenvCliPlugin {
  id?: string;
  /**
   * Setup phase: register commands and wiring on the provided CLI instance.
   * Runs parent → children (pre-order).
   */
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
   * Compositional children. Installed after the parent per pre-order.
   */
  children: GetDotenvCliPlugin[];
  /**
   * Compose a child plugin. Returns the parent to enable chaining.
   */
  use: (child: GetDotenvCliPlugin) => GetDotenvCliPlugin;
}

type DefineSpec = Omit<GetDotenvCliPlugin, 'children' | 'use'> & {
  children?: GetDotenvCliPlugin[];
};

/**
 * Define a GetDotenv CLI plugin with compositional helpers.
 *
 * @example
 * const parent = definePlugin({ id: 'p', setup(cli) { /* ... *\/ } })
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
