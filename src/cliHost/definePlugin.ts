/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
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
import type { GetDotenvCliCtx, ResolvedHelpConfig } from './GetDotenvCli';

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
  /**
   * Create a dynamic option whose description is computed at help time
   * from the resolved configuration.
   */
  createDynamicOption(
    flags: string,
    desc: (
      cfg: ResolvedHelpConfig & { plugins: Record<string, unknown> },
    ) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): Option;
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
 * Compile-time helper type: the plugin object returned by definePlugin always
 * includes the instance-bound helpers as required members. Keeping the public
 * interface optional preserves compatibility for ad-hoc/test plugins, while
 * return types from definePlugin provide stronger DX for shipped/typed plugins.
 */
export type PluginWithInstanceHelpers<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
  TConfig = unknown,
> = GetDotenvCliPlugin<TOptions> & {
  // Default TCfg to the plugin’s TConfig to improve inference at call sites.
  readConfig<TCfg = TConfig>(
    cli: GetDotenvCliPublic<TOptions>,
  ): TCfg | undefined;
  createPluginDynamicOption<TCfg = TConfig>(
    cli: GetDotenvCliPublic<TOptions>,
    flags: string,
    desc: (
      cfg: ResolvedHelpConfig & { plugins: Record<string, unknown> },
      pluginCfg: TCfg | undefined,
    ) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): Option;
};

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
): PluginWithInstanceHelpers<TOptions, TConfig>;
// Base overload (no typed config schema)
export function definePlugin<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
>(spec: DefineSpec<TOptions>): PluginWithInstanceHelpers<TOptions>;
export function definePlugin<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
  TConfig = unknown,
>(
  spec: DefineSpec<TOptions> & { configSchema?: ZodType<TConfig> },
): PluginWithInstanceHelpers<TOptions, TConfig> {
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
  // Attach instance-bound helpers on the returned plugin object.
  const extended = base as PluginWithInstanceHelpers<TOptions, TConfig>;
  extended.readConfig = function <TCfg = TConfig>(
    _cli: GetDotenvCliPublic<TOptions>,
  ): TCfg | undefined {
    // Config is stored per-plugin-instance by the host (WeakMap in computeContext).
    return _getPluginConfigForInstance(
      extended as unknown as GetDotenvCliPlugin,
    ) as TCfg | undefined;
  };
  // Plugin-bound dynamic option factory
  extended.createPluginDynamicOption = function <TCfg = TConfig>(
    cli: GetDotenvCliPublic<TOptions>,
    flags: string,
    desc: (
      cfg: ResolvedHelpConfig & { plugins: Record<string, unknown> },
      pluginCfg: TCfg | undefined,
    ) => string,
    desc: (
      cfg: ResolvedHelpConfig & { plugins: Record<string, unknown> },
      pluginCfg: TCfg | undefined,
    ) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): Option {
    return cli.createDynamicOption(
      flags,
      (cfg) => {
        // Prefer the validated slice stored per instance; fallback to help-bag
        // (by-id) so top-level `-h` can render effective defaults before resolve.
        const fromStore = _getPluginConfigForInstance(
          extended as unknown as GetDotenvCliPlugin,
        ) as TCfg | undefined;
        const id = (extended as { id?: string }).id;
        let fromBag: TCfg | undefined;
        if (!fromStore && id) {
          const maybe = cfg.plugins[id];
          if (maybe && typeof maybe === 'object') fromBag = maybe as TCfg;
        }
        return desc(cfg, fromStore ?? fromBag);
      },
      parser,
      defaultValue,
    );
  };
  return extended;
}
