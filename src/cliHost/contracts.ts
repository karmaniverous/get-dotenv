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

  /**
   * Resolve options and compute the dotenv context for this invocation.
   *
   * @param customOptions - Partial options to overlay for this invocation.
   * @param opts - Optional resolver behavior switches (for example, whether to run `afterResolve`).
   * @returns A promise resolving to the computed invocation context.
   */
  resolveAndLoad(
    customOptions?: Partial<TOptions>,
    opts?: ResolveAndLoadOptions,
  ): Promise<GetDotenvCliCtx<TOptions>>;

  /**
   * Tag an option with a help group identifier for grouped root help rendering.
   *
   * @param opt - The Commander option to tag.
   * @param group - Group identifier (for example, `base`, `app`, or `plugin:<name>`).
   * @returns Nothing.
   */
  setOptionGroup(opt: Option, group: string): void;

  /**
   * Create a dynamic option whose description is computed at help time
   * from the resolved configuration.
   */
  /**
   * Create a dynamic option whose description is computed at help time from the resolved configuration.
   *
   * @param flags - Commander option flags usage string.
   * @param desc - Description builder called during help rendering with the resolved help config.
   * @param parser - Optional argument parser.
   * @param defaultValue - Optional default value.
   * @returns A Commander `Option` instance with a dynamic description.
   */
  createDynamicOption<Usage extends string>(
    flags: Usage,
    desc: (cfg: ResolvedHelpConfig) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): Option<Usage>;
  /** {@inheritDoc} */
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
  /** The child plugin instance to mount under this parent. */
  plugin: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>;
  /**
   * Optional namespace override for the child when mounted under the parent.
   * When provided, this name is used instead of the child's default `ns`.
   */
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
  /**
   * Read the validated (and interpolated) configuration slice for this plugin instance.
   *
   * @param cli - The plugin mount (or any command under this mount) used to resolve the invocation context.
   * @returns The plugin configuration slice, typed as `TCfg`.
   * @throws Error when called before the host has resolved the invocation context.
   */
  readConfig<TCfg = TConfig>(
    cli: GetDotenvCliPublic<TOptions, unknown[], OptionValues, OptionValues>,
  ): Readonly<TCfg>;

  /**
   * Create a Commander option whose help-time description receives the resolved root help config
   * and this plugin instance’s validated configuration slice.
   *
   * @typeParam TCfg - The plugin configuration slice type.
   * @typeParam Usage - The Commander usage string for the option flags.
   * @param cli - The plugin mount used to associate the option with a realized mount path.
   * @param flags - Commander option flags usage string.
   * @param desc - Description builder receiving the resolved help config and the plugin config slice.
   * @param parser - Optional argument parser.
   * @param defaultValue - Optional default value.
   * @returns A Commander `Option` instance with a dynamic description.
   */
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
  /**
   * Plugin setup hook.
   *
   * Called by the host during installation to attach commands/options/hooks to the provided mount.
   *
   * @param cli - The command mount created by the host for this plugin instance.
   * @returns Nothing (or a promise resolving to nothing) after setup completes.
   */
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
