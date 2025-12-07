/** src/cliHost/definePlugin.ts
 * Plugin contracts for the GetDotenv CLI host.
 *
 * This module exposes a structural public interface for the host that plugins
 * should use (GetDotenvCliPublic). Using a structural type at the seam avoids
 * nominal class identity issues (private fields) in downstream consumers.
 */
/* eslint-disable tsdoc/syntax */

// Optional per-plugin config validation (host validates when loader is enabled).
import type { Command, Option } from 'commander';
import { z, type ZodObject } from 'zod';

import type { GetDotenvOptions } from '@/src/GetDotenvOptions';

import { getPluginConfig } from './computeContext';
import type { GetDotenvCliCtx, ResolvedHelpConfig } from './GetDotEnvCli';

/**
 * Structural public interface for the host exposed to plugins.
 * - Extends Commander.Command so plugins can attach options/commands/hooks.
 * - Adds host-specific helpers used by built-in plugins.
 *
 * Purpose: remove nominal class identity (private fields) from the plugin seam
 * to avoid TS2379 under exactOptionalPropertyTypes in downstream consumers.
 */
export interface GetDotenvCliPublic<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
> extends Command {
  ns(name: string): Command;
  /** Return the current context; throws if not yet resolved. */
  getCtx(): GetDotenvCliCtx<TOptions>;
  /** Check whether a context has been resolved (non-throwing). */
  hasCtx(): boolean;
  resolveAndLoad(
    customOptions?: Partial<TOptions>,
    opts?: { runAfterResolve?: boolean },
  ): Promise<GetDotenvCliCtx<TOptions>>;
  setOptionGroup(opt: Option, group: string): void;
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
  // Overload: typed parser & default for value inference
  createDynamicOption<TValue = unknown>(
    flags: string,
    desc: (
      cfg: ResolvedHelpConfig & { plugins: Record<string, unknown> },
    ) => string,
    parser: (value: string, previous?: TValue) => TValue,
    defaultValue?: TValue,
  ): Option;
}

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
   * Zod schema for this plugin's config slice (from config.plugins[id]).
   * Enforced object-like (ZodObject) to simplify code paths and inference.
   */
  configSchema?: ZodObject;
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
  readConfig<TCfg = TConfig>(cli: GetDotenvCliPublic<TOptions>): Readonly<TCfg>;
  createPluginDynamicOption<TCfg = TConfig>(
    cli: GetDotenvCliPublic<TOptions>,
    flags: string,
    desc: (
      cfg: ResolvedHelpConfig & { plugins: Record<string, unknown> },
      pluginCfg: Readonly<TCfg>,
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
 * const parent = definePlugin({ id: 'p', setup(cli) { /* omitted *\/ } })
 *   .use(childA)
 *   .use(childB);
 */
// Overload A (Zod-first): infer TConfig from provided ZodObject schema
export function definePlugin<
  TOptions extends GetDotenvOptions,
  Schema extends ZodObject,
>(
  spec: Omit<DefineSpec<TOptions>, 'configSchema'> & { configSchema: Schema },
): PluginWithInstanceHelpers<TOptions, z.output<Schema>>;
// Overload B (no schema provided): config type is {}
export function definePlugin<TOptions extends GetDotenvOptions>(
  spec: DefineSpec<TOptions>,
): PluginWithInstanceHelpers<TOptions, {}>;
export function definePlugin<TOptions extends GetDotenvOptions>(
  spec: DefineSpec<TOptions> & { configSchema?: ZodObject },
): PluginWithInstanceHelpers<TOptions> {
  const { children = [], ...rest } = spec;
  // Default to a strict empty-object schema so “no-config” plugins fail fast
  // on unknown keys and provide a concrete {} at runtime.
  const effectiveSchema =
    (
      spec as {
        configSchema?: ZodObject;
      }
    ).configSchema ?? z.object({}).strict();

  // Build base plugin first, then extend with instance-bound helpers.
  const base: GetDotenvCliPlugin<TOptions> = {
    ...rest,
    // Always carry a schema (strict empty by default) to simplify host logic
    // and improve inference/ergonomics for plugin authors.
    configSchema: effectiveSchema,
    children: [...children],
    use(child) {
      this.children.push(child);
      return this;
    },
  };

  // Attach instance-bound helpers on the returned plugin object.
  const extended = base as PluginWithInstanceHelpers<TOptions>;

  extended.readConfig = function <TCfg = unknown>(
    _cli: GetDotenvCliPublic<TOptions>,
  ): Readonly<TCfg> {
    // Config is stored per-plugin-instance by the host (WeakMap in computeContext).
    const value = getPluginConfig<TOptions, TCfg>(
      extended as unknown as GetDotenvCliPlugin<TOptions>,
    );
    if (value === undefined) {
      // Guard: host has not resolved config yet (incorrect lifecycle usage).
      throw new Error(
        'Plugin config not available. Ensure resolveAndLoad() has been called before readConfig().',
      );
    }
    return value;
  };

  // Plugin-bound dynamic option factory
  extended.createPluginDynamicOption = function <TCfg = unknown>(
    cli: GetDotenvCliPublic<TOptions>,
    flags: string,
    desc: (
      cfg: ResolvedHelpConfig & { plugins: Record<string, unknown> },
      pluginCfg: Readonly<TCfg>,
    ) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): Option {
    return cli.createDynamicOption(
      flags,
      (cfg) => {
        // Prefer the validated slice stored per instance; fallback to help-bag
        // (by-id) so top-level `-h` can render effective defaults before resolve.
        const fromStore = getPluginConfig<TOptions, TCfg>(
          extended as unknown as GetDotenvCliPlugin<TOptions>,
        );
        const id = (extended as { id?: string }).id;
        let fromBag: Readonly<TCfg> | undefined;
        if (!fromStore && id) {
          const maybe = cfg.plugins[id];
          if (maybe && typeof maybe === 'object') {
            fromBag = maybe as unknown as Readonly<TCfg>;
          }
        }
        // Always provide a concrete object to dynamic callbacks:
        // - With a schema: computeContext stores the parsed object.
        // - Without a schema: computeContext stores {}.
        // - Help-time fallback: coalesce to {} when only a by-id bag exists.
        const cfgVal = (fromStore ?? fromBag ?? {}) as Readonly<TCfg>;
        return desc(cfg, cfgVal);
      },
      parser,
      defaultValue,
    );
  };

  return extended;
}
