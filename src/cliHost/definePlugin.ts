/** src/cliHost/definePlugin.ts
 * Plugin contracts for the GetDotenv CLI host.
 *
 * This module exposes a structural public interface for the host that plugins
 * should use (GetDotenvCliPublic). Using a structural type at the seam avoids
 * nominal class identity issues (private fields) in downstream consumers.
 */

// Optional per-plugin config validation (host validates when loader is enabled).
import type { Command } from 'commander';
import type { ZodType } from 'zod';

import type { GetDotenvOptions } from '../GetDotenvOptions';
import type { GetDotenvCliCtx } from './GetDotenvCli';

/**
 * Structural public interface for the host exposed to plugins.
 * - Extends Commander.Command so plugins can attach options/commands/hooks.
 * - Adds host-specific helpers used by built-in plugins.
 *
 * Purpose: remove nominal class identity (private fields) from the plugin seam
 * to avoid TS2379 under exactOptionalPropertyTypes in downstream consumers.
 */
export type GetDotenvCliPublic<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
> = Command & {
  ns: (name: string) => Command;
  getCtx: () => GetDotenvCliCtx<TOptions> | undefined;
  resolveAndLoad: (
    customOptions?: Partial<TOptions>,
  ) => Promise<GetDotenvCliCtx<TOptions>>;
};

/** Public plugin contract used by the GetDotenv CLI host. */
export interface GetDotenvCliPlugin {
  id?: string;
  /**
   * Setup phase: register commands and wiring on the provided CLI instance.
   * Runs parent → children (pre-order).
   */
  setup: (cli: GetDotenvCliPublic) => void | Promise<void>;
  /**
   * After the dotenv context is resolved, initialize any clients/secrets
   * or attach per-plugin state under ctx.plugins (by convention).
   * Runs parent → children (pre-order).
   */
  afterResolve?: (
    cli: GetDotenvCliPublic,
    ctx: GetDotenvCliCtx,
  ) => void | Promise<void>;
  /**
   * Optional Zod schema for this plugin's config slice (from config.plugins[id]).
   * When provided, the host validates the merged config under the guarded loader path.
   */
  configSchema?: ZodType;
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
