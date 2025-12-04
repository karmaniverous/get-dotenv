/** src/cliHost/definePlugin.ts
 * Plugin contracts for the GetDotenv CLI host.
 *
 * This module exposes a structural public interface for the host that plugins
 * should use (GetDotenvCliPublic). Using a structural type at the seam avoids
 * nominal class identity issues (private fields) in downstream consumers.
 */

// Optional per-plugin config validation (host validates when loader is enabled).
import type { Command, Option } from 'commander';
import type { ZodType } from 'zod';

import type { GetDotenvOptions } from '../GetDotenvOptions';
import { _getPluginConfigForInstance } from './computeContext';
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
    opts?: { runAfterResolve?: boolean },
  ) => Promise<GetDotenvCliCtx<TOptions>>;
  setOptionGroup: (opt: Option, group: string) => void;
};

/** Public plugin contract used by the GetDotenv CLI host. */
export interface GetDotenvCliPlugin<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
> {
  id?: string;
  /**
   * Setup phase: register commands and wiring on the provided CLI instance.
   * Runs parent → children (pre-order).
   */
  setup: (cli: GetDotenvCliPublic<TOptions>) => void | Promise<void>;
  /**
   * After the dotenv context is resolved, initialize any clients/secrets
   * or attach per-plugin state under ctx.plugins (by convention).
   * Runs parent → children (pre-order).
   */
  afterResolve?: (
    cli: GetDotenvCliPublic<TOptions>,
    ctx: GetDotenvCliCtx<TOptions>,
  ) => void | Promise<void>;
  /**
   * Optional Zod schema for this plugin's config slice (from config.plugins[id]).
   * When provided, the host validates the merged config under the guarded loader path.
   */
  configSchema?: ZodType;
  /**
   * Compositional children. Installed after the parent per pre-order.
   */
  children: GetDotenvCliPlugin<TOptions>[];
  /**
   * Compose a child plugin. Returns the parent to enable chaining.
   */
  use: (child: GetDotenvCliPlugin<TOptions>) => GetDotenvCliPlugin<TOptions>;
}

/**
 * Public spec type for defining a plugin with optional children.
 * Exported to ensure TypeDoc links and navigation resolve correctly.
 */
export type DefineSpec<TOptions extends GetDotenvOptions = GetDotenvOptions> =
  Omit<GetDotenvCliPlugin<TOptions>, 'children' | 'use'> & {
    children?: GetDotenvCliPlugin<TOptions>[];
  };

/**
 * Define a GetDotenv CLI plugin with compositional helpers.
 *
 * @example
 * const parent = definePlugin(\{ id: 'p', setup(cli) \{ /* ... *\/ \} \})
 *   .use(childA)
 *   .use(childB);
 */
// Overload carrying a typed config schema (compile-time aid only).
export function definePlugin<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
  TConfig = unknown,
>(
  spec: DefineSpec<TOptions> & { configSchema?: ZodType<TConfig> },
): GetDotenvCliPlugin<TOptions>;
// Base overload (no typed config schema)
export function definePlugin<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
>(spec: DefineSpec<TOptions>): GetDotenvCliPlugin<TOptions>;
export function definePlugin<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
>(spec: DefineSpec<TOptions>): GetDotenvCliPlugin<TOptions> {
  const { children = [], ...rest } = spec;
  // Build base plugin first, then extend with instance-bound helpers.
  const base: GetDotenvCliPlugin<TOptions> = {
    ...rest,
    children: [...children],
    use(child) {
      this.children.push(child);
      return this;
    },
  };
  const extended = base as GetDotenvCliPlugin<TOptions> & {
    /**
     * Return the validated/interpolated config slice for this plugin instance.
     * Instance-bound; host stores per-instance slices in a WeakMap.
     */
    readConfig: <TConfig>(
      _cli: GetDotenvCliPublic<TOptions>,
    ) => TConfig | undefined;
    /**
     * Convenience to create a plugin-bound dynamic option where the callback
     * receives this plugin’s config slice as the second param.
     */
    createPluginDynamicOption: <TConfig, TPlugins = Record<string, unknown>>(
      flags: string,
      desc: (
        cfg: Partial<GetDotenvOptions> & { plugins: TPlugins },
        pluginCfg: TConfig | undefined,
      ) => string,
      parser?: (value: string, previous?: unknown) => unknown,
      defaultValue?: unknown,
    ) => Option;
  };
  extended.readConfig = function <TConfig>(
    _cli: GetDotenvCliPublic<TOptions>,
  ): TConfig | undefined {
    return _getPluginConfigForInstance<TConfig>(extended);
  };
  extended.createPluginDynamicOption = function <
    TConfig,
    TPlugins = Record<string, unknown>,
  >(
    flags: string,
    desc: (
      cfg: Partial<GetDotenvOptions> & { plugins: TPlugins },
      pluginCfg: TConfig | undefined,
    ) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): Option {
    // The returned Option is created by the host; we only wrap the description
    // so it receives this instance’s config slice at help-evaluation time.
    const self = extended;
    // dynamicOption is available on the structural host type
    const opt = arguments[0] as unknown;
    void opt;
    // The host will call createDynamicOption on itself; the plugin passes a wrapper.
    return (
      arguments as unknown as { 0: GetDotenvCliPublic<TOptions> }
    )[0].createDynamicOption(
      flags,
      (cfg) => desc(cfg, _getPluginConfigForInstance<TConfig>(self)),
      parser,
      defaultValue,
    );
  } as any;
  return extended;
}
