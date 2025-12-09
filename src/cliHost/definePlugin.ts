/** src/cliHost/definePlugin.ts
 * Plugin contracts for the GetDotenv CLI host.
 *
 * Notes:
 * - setup may optionally return a mount (a command namespace) where children should be installed.
 *
 * This module exposes a structural public interface for the host that plugins
 * should use (GetDotenvCliPublic). Using a structural type at the seam avoids
 * nominal class identity issues (private fields) in downstream consumers.
 */
/* eslint-disable tsdoc/syntax */

// Optional per-plugin config validation (host validates when loader is enabled).
import type {
  Command,
  InferCommandArguments,
  Option,
  OptionValues,
} from '@commander-js/extra-typings';
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
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
> extends Command<TArgs, TOpts, TGlobal> {
  /**
   * Create a namespaced child command with argument inference.
   * Mirrors Commander generics so downstream chaining remains fully typed.
   */
  ns<Usage extends string>(
    name: Usage,
  ): GetDotenvCliPublic<
    TOptions,
    [...TArgs, ...InferCommandArguments<Usage>],
    {},
    TOpts & TGlobal
  >;

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
  createDynamicOption<Usage extends string>(
    flags: Usage,
    desc: (
      cfg: ResolvedHelpConfig & { plugins: Record<string, unknown> },
    ) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): Option<Usage>;
  // Overload: typed parser & default for value inference
  createDynamicOption<Usage extends string, TValue = unknown>(
    flags: Usage,
    desc: (
      cfg: ResolvedHelpConfig & { plugins: Record<string, unknown> },
    ) => string,
    parser: (value: string, previous?: TValue) => TValue,
    defaultValue?: TValue,
  ): Option<Usage>;
}

/** Public plugin contract used by the GetDotenv CLI host. */
export interface GetDotenvCliPlugin<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
> {
  id?: string;

  /**
   * Setup phase: register commands and wiring on the provided CLI instance.
   * Runs parent → children (pre-order).
   *
   * Optional: return the "mount point" (a namespaced command) where this
   * plugin's children should be installed. When omitted, children mount at the
   * same cli that was passed in.
   */
  setup: (
    cli: GetDotenvCliPublic<TOptions, TArgs, TOpts, TGlobal>,
  ) =>
    | GetDotenvCliPublic
    | Command
    | Promise<GetDotenvCliPublic | Command | undefined>
    | undefined;
  /**
   * After the dotenv context is resolved, initialize any clients/secrets
   * or attach per-plugin state under ctx.plugins (by convention).
   * Runs parent → children (pre-order).
   */
  afterResolve?: (
    cli: GetDotenvCliPublic<TOptions, TArgs, TOpts, TGlobal>,
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
  children: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>[];

  /**
   * Compose a child plugin. Returns the parent to enable chaining.
   */
  use: (
    child: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>,
  ) => GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>;
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
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
> = GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal> & {
  // Instance-bound helpers preserve plugin identity and inject validated slices.
  // Default TCfg to the plugin’s TConfig to improve inference at call sites.
  readConfig<TCfg = TConfig>(
    cli: GetDotenvCliPublic<TOptions, unknown[], OptionValues, OptionValues>,
  ): Readonly<TCfg>;

  createPluginDynamicOption<TCfg = TConfig, Usage extends string = string>(
    cli: GetDotenvCliPublic<TOptions, unknown[], OptionValues, OptionValues>,
    flags: Usage,
    desc: (
      cfg: ResolvedHelpConfig & { plugins: Record<string, unknown> },
      pluginCfg: Readonly<TCfg>,
    ) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): Option<Usage>;
};

/**
 * Public spec type for defining a plugin with optional children.
 * Exported to ensure TypeDoc links and navigation resolve correctly.
 */
export type DefineSpec<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
> = Omit<
  GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>,
  'children' | 'use'
> & {
  children?: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>[];
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

// Implementation
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
    _cli: GetDotenvCliPublic<TOptions, unknown[], OptionValues, OptionValues>,
  ): Readonly<TCfg> {
    // Config is stored per-plugin-instance by the host (WeakMap in computeContext).
    const value = getPluginConfig<
      TOptions,
      TCfg,
      unknown[],
      OptionValues,
      OptionValues
    >(
      extended as unknown as GetDotenvCliPlugin<
        TOptions,
        unknown[],
        OptionValues,
        OptionValues
      >,
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
  extended.createPluginDynamicOption = function <
    TCfg = unknown,
    Usage extends string = string,
  >(
    cli: GetDotenvCliPublic<TOptions, unknown[], OptionValues, OptionValues>,
    flags: Usage,
    desc: (
      cfg: ResolvedHelpConfig & { plugins: Record<string, unknown> },
      pluginCfg: Readonly<TCfg>,
    ) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): Option<Usage> {
    return cli.createDynamicOption<Usage>(
      flags,
      (c) => {
        // Prefer the validated slice stored per instance; fallback to help-bag
        // (by-id) so top-level `-h` can render effective defaults before resolve.
        const fromStore = getPluginConfig<
          TOptions,
          TCfg,
          unknown[],
          OptionValues,
          OptionValues
        >(
          extended as unknown as GetDotenvCliPlugin<
            TOptions,
            unknown[],
            OptionValues,
            OptionValues
          >,
        );
        const id = (extended as { id?: string }).id;
        let fromBag: Readonly<TCfg> | undefined;
        if (!fromStore && id) {
          const maybe = (
            c as ResolvedHelpConfig & {
              plugins: Record<string, unknown>;
            }
          ).plugins[id];
          if (maybe && typeof maybe === 'object') {
            fromBag = maybe as unknown as Readonly<TCfg>;
          }
        }
        // Always provide a concrete object to dynamic callbacks:
        // - With a schema: computeContext stores the parsed object.
        // - Without a schema: computeContext stores {}.
        // - Help-time fallback: coalesce to {} when only a by-id bag exists.
        const cfgVal = (fromStore ?? fromBag ?? {}) as Readonly<TCfg>;
        return desc(
          c as ResolvedHelpConfig & { plugins: Record<string, unknown> },
          cfgVal,
        );
      },
      parser,
      defaultValue,
    );
  };

  return extended;
}
