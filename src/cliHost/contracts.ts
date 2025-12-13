/** src/cliHost/definePlugin/contracts.ts
 * Public contracts for plugin authoring (types only).
 * - No runtime logic or state.
 * - Safe to import broadly without introducing cycles.
 */
import type {
  Command,
  InferCommandArguments,
  Option,
  OptionValues,
} from '@commander-js/extra-typings';
import type { ZodObject } from 'zod';

import type { GetDotenvOptions } from '@/src/core';

import type { ResolvedHelpConfig } from './helpConfig';
import type { GetDotenvCliCtx } from './types';

/**
 * Options for resolving and loading the configuration.
 *
 * @public
 */
export interface ResolveAndLoadOptions {
  /**
   * When false, skips running plugin afterResolve hooks.
   * Useful for top-level help rendering to avoid long-running side-effects
   * while still evaluating dynamic help text.
   *
   * @default true
   */
  runAfterResolve?: boolean;
}

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
    opts?: ResolveAndLoadOptions,
  ): Promise<GetDotenvCliCtx<TOptions>>;

  setOptionGroup(opt: Option, group: string): void;

  /**
   * Create a dynamic option whose description is computed at help time
   * from the resolved configuration.
   */
  createDynamicOption<Usage extends string>(
    flags: Usage,
    desc: (cfg: ResolvedHelpConfig) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): Option<Usage>;
  createDynamicOption<Usage extends string, TValue = unknown>(
    flags: Usage,
    desc: (cfg: ResolvedHelpConfig) => string,
    parser: (value: string, previous?: TValue) => TValue,
    defaultValue?: TValue,
  ): Option<Usage>;
}

/**
 * Optional overrides for plugin composition.
 *
 * @public
 */
export interface PluginNamespaceOverride {
  /**
   * Override the default namespace for this plugin instance.
   */
  ns?: string;
}

/**
 * An entry in the plugin children array.
 *
 * @public
 */
export interface PluginChildEntry<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
> {
  plugin: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>;
  override: PluginNamespaceOverride | undefined;
}

/** Public plugin contract used by the GetDotenv CLI host. */
export interface GetDotenvCliPlugin<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
> {
  /** Namespace (required): the command name where this plugin is mounted. */
  ns: string;

  /**
   * Setup phase: register commands and wiring on the provided mount.
   * Runs parent → children (pre-order). Return nothing (void).
   */
  setup: (
    cli: GetDotenvCliPublic<TOptions, TArgs, TOpts, TGlobal>,
  ) => void | Promise<void>;

  /**
   * After the dotenv context is resolved, initialize any clients/secrets
   * or attach per-plugin state under ctx.plugins (by convention).
   * Runs parent → children (pre-order).
   */
  afterResolve?: (
    cli: GetDotenvCliPublic<TOptions, TArgs, TOpts, TGlobal>,
    ctx: GetDotenvCliCtx<TOptions>,
  ) => void | Promise<void>;

  /** Zod schema for this plugin's config slice (from config.plugins[…]). */
  configSchema?: ZodObject;

  /**
   * Compositional children, with optional per-child overrides (e.g., ns).
   * Installed after the parent per pre-order.
   */
  children: Array<PluginChildEntry<TOptions, TArgs, TOpts, TGlobal>>;

  /**
   * Compose a child plugin with optional override (ns). Returns the parent
   * to enable chaining.
   */
  use: (
    child: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>,
    override?: PluginNamespaceOverride,
  ) => GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>;
}

/**
 * Compile-time helper type: the plugin object returned by definePlugin always
 * includes the instance-bound helpers as required members. Keeping the public
 * interface optional preserves compatibility for ad-hoc/test plugins, while
 * return types from definePlugin provide stronger DX for shipped/typed plugins.
 */
export interface PluginWithInstanceHelpers<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
  TConfig = unknown,
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
> extends GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal> {
  // Instance-bound helpers preserve plugin identity and inject validated slices.
  readConfig<TCfg = TConfig>(
    cli: GetDotenvCliPublic<TOptions, unknown[], OptionValues, OptionValues>,
  ): Readonly<TCfg>;

  createPluginDynamicOption<TCfg = TConfig, Usage extends string = string>(
    cli: GetDotenvCliPublic<TOptions, unknown[], OptionValues, OptionValues>,
    flags: Usage,
    desc: (cfg: ResolvedHelpConfig, pluginCfg: Readonly<TCfg>) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): Option<Usage>;
}

/**
 * Public spec type for defining a plugin with compositional helpers.
 */
export type DefineSpec<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
> = Omit<
  GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>,
  'children' | 'use' | 'setup'
> & {
  /**
   * Required namespace and setup function. The host creates the mount and
   * passes it into setup; return void | Promise<void>.
   */
  ns: string;
  setup: (
    cli: GetDotenvCliPublic<TOptions, TArgs, TOpts, TGlobal>,
  ) => void | Promise<void>;
};

/**
 * Helper to infer the configuration type from a `PluginWithInstanceHelpers` type.
 */
export type InferPluginConfig<P> =
  P extends PluginWithInstanceHelpers<GetDotenvOptions, infer C>
    ? Readonly<C>
    : never;
