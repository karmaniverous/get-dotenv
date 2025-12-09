/** src/cliHost/definePlugin.ts
 * Plugin contracts for the GetDotenv CLI host (host-created mounts model).
 *
 * Key points:
 * - Every plugin declares a required namespace `ns` (string). The host creates
 *   the mount using parent.ns(effectiveNs) and passes that mount to setup.
 * - setup returns void | Promise<void> (no return-the-mount).
 * - Composition is via .use(child, { ns?: string }) with optional namespace
 *   override at composition time. The installer enforces sibling uniqueness.
 *
 * This module exposes a structural public interface for the host that plugins
 * should use (GetDotenvCliPublic). Using a structural type at the seam avoids
 * nominal class identity issues (private fields) in downstream consumers.
 */
/* eslint-disable tsdoc/syntax */

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
  /**
   * Namespace (required): the command name where this plugin is mounted.
   * The host creates this mount and passes it into setup.
   */
  ns: string;

  /**
   * Optional identifier retained for backwards-compatible diagnostics/help
   * fallback during top-level help rendering. Not used as a public config key.
   */
  id?: string;

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

  /**
   * Zod schema for this plugin's config slice (from config.plugins[…]).
   */
  configSchema?: ZodObject;

  /**
   * Compositional children, with optional per-child overrides (e.g., ns).
   * Installed after the parent per pre-order.
   */
  children: Array<{
    plugin: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>;
    override?: { ns?: string };
  }>;

  /**
   * Compose a child plugin with optional override (ns). Returns the parent
   * to enable chaining.
   */
  use: (
    child: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>,
    override?: { ns?: string },
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
 * Define a GetDotenv CLI plugin with compositional helpers.
 *
 * @example
 * const p = definePlugin({ ns: 'aws', setup(cli) { /* wire subcommands *\/ } })
 *   .use(child, { ns: 'whoami' });
 */
export function definePlugin<
  TOptions extends GetDotenvOptions,
  Schema extends ZodObject,
>(
  spec: Omit<DefineSpec<TOptions>, 'configSchema'> & { configSchema: Schema },
): PluginWithInstanceHelpers<TOptions, z.output<Schema>>;

export function definePlugin<TOptions extends GetDotenvOptions>(
  spec: DefineSpec<TOptions>,
): PluginWithInstanceHelpers<TOptions, {}>;

// Implementation
export function definePlugin<TOptions extends GetDotenvOptions>(
  spec: DefineSpec<TOptions> & { configSchema?: ZodObject },
): PluginWithInstanceHelpers<TOptions> {
  const { ...rest } = spec;

  const effectiveSchema =
    (
      spec as {
        configSchema?: ZodObject;
      }
    ).configSchema ?? z.object({}).strict();

  const base: GetDotenvCliPlugin<TOptions> = {
    ...rest,
    configSchema: effectiveSchema,
    children: [],
    use(child, override) {
      this.children.push({ plugin: child, override });
      return this;
    },
  };

  const extended = base as PluginWithInstanceHelpers<TOptions>;

  extended.readConfig = function <TCfg = unknown>(
    _cli: GetDotenvCliPublic<TOptions, unknown[], OptionValues, OptionValues>,
  ): Readonly<TCfg> {
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
      throw new Error(
        'Plugin config not available. Ensure resolveAndLoad() has been called before readConfig().',
      );
    }
    return value;
  };

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
