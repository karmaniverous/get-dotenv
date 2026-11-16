/** src/cliHost/GetDotenvCli.ts
 * Plugin-first CLI host for get-dotenv with Commander generics preserved.
 * Public surface implements GetDotenvCliPublic and provides:
 *  - attachRootOptions (builder-only; no public override wiring)
 *  - resolveAndLoad (strict resolve + context compute)
 *  - getCtx/hasCtx accessors
 *  - ns() for typed subcommand creation with duplicate-name guard
 *  - grouped help rendering with dynamic option descriptions
 */

import {
  Command,
  type CommandUnknownOpts,
  type InferCommandArguments,
  type Option,
  type OptionValues,
} from '@commander-js/extra-typings';

import type { GetDotenvOptions } from '@/src/core';
import { baseRootOptionDefaults } from '@/src/defaults';
import { readHostPackage } from '@/src/util/packageRoot';

import { attachRootOptions as attachRootOptionsBuilder } from './attachRootOptions';
import { buildHelpInformation } from './buildHelpInformation';
import type {
  GetDotenvCliPlugin,
  GetDotenvCliPublic,
  NsOptions,
  PluginChildEntry,
  PluginNamespaceOverride,
  ResolveAndLoadOptions,
} from './contracts';
import {
  evaluateDynamicOptions as evalDyn,
  makeDynamicOption,
} from './dynamicOptions';
import type { GetDotenvCliOptions } from './GetDotenvCliOptions';
import { GROUP_TAG } from './groups';
import type { ResolvedHelpConfig } from './helpConfig';
import { initializeInstance } from './initializeInstance';
import { flattenPluginTreeByPath, joinRealizedPath } from './paths';
import { setupPluginTree } from './registerPlugin';
import { resolveAndComputeContext } from './resolveAndComputeContext';
import { runAfterResolveTree } from './runAfterResolve';
import { tagAppOptionsAround } from './tagAppOptionsHelper';
import type { BrandOptions, GetDotenvCliCtx, RootOptionsShape } from './types';

const HOST_META_URL = import.meta.url;

const CTX_SYMBOL = Symbol('GetDotenvCli.ctx');
const OPTS_SYMBOL = Symbol('GetDotenvCli.options');
const HELP_HEADER_SYMBOL = Symbol('GetDotenvCli.helpHeader');

/**
 * Plugin-first CLI host for get-dotenv. Extends Commander.Command.
 *
 * Responsibilities:
 * - Resolve options strictly and compute dotenv context (resolveAndLoad).
 * - Expose a stable accessor for the current context (getCtx).
 * - Provide a namespacing helper (ns).
 * - Support composable plugins with parent → children install and afterResolve.
 */
export class GetDotenvCli<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
>
  extends Command<TArgs, TOpts, TGlobal>
  implements GetDotenvCliPublic<TOptions, TArgs, TOpts, TGlobal>
{
  /** Registered top-level plugins (composition happens via .use()) */
  private _plugins: Array<PluginChildEntry<TOptions, TArgs, TOpts, TGlobal>> =
    [];

  /** One-time installation guard */
  private _installed = false;
  /** In-flight installation promise to guard against concurrent installs */
  private _installing?: Promise<void>;
  /** Optional header line to prepend in help output */
  private [HELP_HEADER_SYMBOL]: string | undefined;
  /** Context/options stored under symbols (typed) */
  private [CTX_SYMBOL]?: GetDotenvCliCtx<TOptions>;
  private [OPTS_SYMBOL]?: GetDotenvCliOptions;

  /**
   * Create a subcommand using the same subclass, preserving helpers like
   * dynamicOption on children.
   */
  override createCommand(name?: string): GetDotenvCli<TOptions> {
    // Explicitly construct a GetDotenvCli for children to preserve helpers.
    return new GetDotenvCli(name);
  }

  constructor(alias = 'getdotenv') {
    super(alias);
    this.enablePositionalOptions();
    // Delegate the heavy setup to a helper to keep the constructor lean.
    initializeInstance(
      this as unknown as GetDotenvCli,
      () => this[HELP_HEADER_SYMBOL],
    );
  }

  /**
   * Attach legacy/base root flags to this CLI instance.
   * Delegates to the pure builder in attachRootOptions.ts.
   *
   * The flags get no Commander defaults: `opts()` holds only values given on
   * the command line. `defaults` only shapes the help text.
   */
  attachRootOptions(defaults?: Partial<RootOptionsShape>): this {
    const d = (defaults ?? baseRootOptionDefaults) as Partial<RootOptionsShape>;
    attachRootOptionsBuilder(this as unknown as GetDotenvCli, d);
    return this;
  }

  /**
   * Resolve options (strict) and compute dotenv context.
   * Stores the context on the instance under a symbol.
   *
   * @param customOptions - Partial options to overlay for this invocation.
   * @param opts - Optional resolver behavior switches.
   *   - `runAfterResolve` (default `true`): when false, skips running plugin
   *     afterResolve hooks. Useful for top-level help rendering to avoid
   *     long-running side-effects while still evaluating dynamic help text.
   *   - `invokedSubcommand`: when provided, only the plugin subtree whose
   *     realized mount path is this name (its effective namespace: override
   *     \> default) runs afterResolve hooks. When omitted, all plugins run
   *     afterResolve (backward compatibility).
   */
  async resolveAndLoad(
    customOptions: Partial<TOptions> = {},
    opts?: ResolveAndLoadOptions,
  ): Promise<GetDotenvCliCtx<TOptions>> {
    const ctx = await resolveAndComputeContext<TOptions, TArgs, TOpts, TGlobal>(
      customOptions,
      // Entries carry namespace overrides, which key config by realized path.
      this._plugins,
      HOST_META_URL,
    );

    // Persist context on the instance for later access.
    this[CTX_SYMBOL] = ctx;

    // Ensure plugins are installed exactly once, then run afterResolve.
    await this.install();
    if (opts?.runAfterResolve ?? true) {
      const path = opts?.invokedSubcommand
        ? [opts.invokedSubcommand]
        : undefined;
      await this._runAfterResolve(ctx, path);
    }

    return ctx;
  }

  /**
   * Create a Commander Option that computes its description at help time.
   * The returned Option may be configured (conflicts, default, parser) and
   * added via addOption().
   */
  // Base overload (parser/default optional; preferred match for 2-arg calls)
  createDynamicOption<Usage extends string>(
    flags: Usage,
    desc: (cfg: ResolvedHelpConfig) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): Option<Usage>;
  // Overload: typed parser & default for value inference
  createDynamicOption<Usage extends string, TValue = unknown>(
    flags: Usage,
    desc: (cfg: ResolvedHelpConfig) => string,
    parser: (value: string, previous?: TValue) => TValue,
    defaultValue?: TValue,
  ): Option<Usage>;
  // Implementation
  createDynamicOption<Usage extends string>(
    flags: Usage,
    desc: (cfg: ResolvedHelpConfig) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): Option<Usage> {
    return makeDynamicOption(flags, (c) => desc(c), parser, defaultValue);
  }

  /**
   * Evaluate dynamic descriptions for this command and all descendants using
   * the provided resolved configuration. Mutates the Option.description in
   * place so Commander help renders updated text.
   */
  evaluateDynamicOptions(resolved: ResolvedHelpConfig): void {
    evalDyn(this, resolved);
  }

  /** Internal: climb to the true root (host) command. */
  private _root(): GetDotenvCli {
    let node: CommandUnknownOpts | null = this.parent;

    if (!node) return this as unknown as GetDotenvCli;

    while (node.parent) {
      node = node.parent;
    }
    return node as unknown as GetDotenvCli;
  }

  /**
   * Retrieve the current invocation context (if any).
   */
  getCtx(): GetDotenvCliCtx<TOptions> {
    let ctx = this[CTX_SYMBOL];
    if (!ctx) {
      const root = this._root();
      ctx = (root as unknown as { [k: symbol]: unknown })[CTX_SYMBOL] as
        GetDotenvCliCtx<TOptions> | undefined;
    }
    if (!ctx) {
      throw new Error(
        'Dotenv context unavailable. Ensure resolveAndLoad() has been called or the host is wired with passOptions() before invoking commands.',
      );
    }
    return ctx;
  }

  /**
   * Check whether a context has been resolved (non-throwing guard).
   */
  hasCtx(): boolean {
    if (this[CTX_SYMBOL] !== undefined) return true;
    const root = this._root() as unknown as { [k: symbol]: unknown };
    return root[CTX_SYMBOL] !== undefined;
  }

  /**
   * Retrieve the merged root CLI options bag (if set by passOptions()).
   * Downstream-safe: no generics required.
   */
  getOptions(): GetDotenvCliOptions | undefined {
    if (this[OPTS_SYMBOL]) return this[OPTS_SYMBOL];
    const root = this._root() as unknown as { [k: symbol]: unknown };
    const bag = root[OPTS_SYMBOL] as GetDotenvCliOptions | undefined;
    if (bag) return bag;
    return undefined;
  }

  /** Internal: set the merged root options bag for this run. */
  _setOptionsBag(bag: GetDotenvCliOptions): void {
    this[OPTS_SYMBOL] = bag;
  }

  /**
   * Convenience helper to create a namespaced subcommand with argument inference.
   * This mirrors Commander generics so downstream chaining stays fully typed.
   */
  ns<Usage extends string>(
    name: Usage,
    opts?: NsOptions,
  ): GetDotenvCliPublic<
    TOptions,
    [...TArgs, ...InferCommandArguments<Usage>],
    {},
    TOpts & TGlobal
  > {
    // Guard against same-level duplicate command names for clearer diagnostics.
    const exists = this.commands.some((c) => c.name() === name);
    if (exists) {
      throw new Error(`Duplicate command name: ${name}`);
    }
    return this.command(name, {
      ...(opts?.isDefault !== undefined ? { isDefault: opts.isDefault } : {}),
      ...(opts?.hidden !== undefined ? { hidden: opts.hidden } : {}),
    }) as unknown as GetDotenvCliPublic<
      TOptions,
      [...TArgs, ...InferCommandArguments<Usage>],
      {},
      TOpts & TGlobal
    >;
  }

  /**
   * Tag options added during the provided callback as 'app' for grouped help.
   * Allows downstream apps to demarcate their root-level options.
   */
  tagAppOptions<T>(fn: (root: CommandUnknownOpts) => T): T {
    return tagAppOptionsAround(
      this as unknown as CommandUnknownOpts,
      this.setOptionGroup.bind(this),
      fn,
    );
  }

  /**
   * Branding helper: set CLI name/description/version and optional help header.
   * If version is omitted and importMetaUrl is provided, attempts to read the
   * nearest package.json version (best-effort; non-fatal on failure).
   */
  async brand(args: BrandOptions): Promise<this> {
    const { name, description, version, importMetaUrl, helpHeader } = args;
    if (typeof name === 'string' && name.length > 0) this.name(name);
    if (typeof description === 'string') this.description(description);
    const v = version ?? (await readHostPackage(importMetaUrl))?.version;
    if (v) this.version(v);
    // Help header:
    // - If caller provides helpHeader, use it.
    // - Otherwise, when a version is known, default to "<name> v<version>".
    if (typeof helpHeader === 'string') {
      this[HELP_HEADER_SYMBOL] = helpHeader;
    } else if (v) {
      const header = `${this.name()} v${v}`;
      this[HELP_HEADER_SYMBOL] = header;
    }
    return this;
  }

  /**
   * Insert grouped plugin/app options between "Options" and "Commands" for
   * hybrid ordering. Applies to root and any parent command.
   */
  override helpInformation(): string {
    return buildHelpInformation(super.helpInformation(), this);
  }

  /**
   * Public: tag an Option with a display group for help (root/app/plugin:<id>).
   */
  setOptionGroup(opt: Option, group: string): void {
    GROUP_TAG.set(opt, group);
  }

  /**
   * Register a plugin for installation (parent level).
   * Installation occurs on first resolveAndLoad() (or explicit install()).
   *
   * @param plugin - The plugin instance to mount at the root.
   * @param override - Optional `\{ ns \}`: mount the plugin under this name
   *   instead of its own `ns`. The name also keys its config slice and
   *   scopes its afterResolve hook. Root-level names must be unique; a
   *   collision throws the guided duplicate-namespace error at install.
   */
  use(
    plugin: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>,
    override?: PluginNamespaceOverride,
  ): this {
    this._plugins.push({ plugin, override });
    return this;
  }

  /**
   * Install all registered plugins in parent → children (pre-order).
   * Runs only once per CLI instance.
   */
  async install(): Promise<void> {
    if (this._installed) return;
    if (this._installing) {
      await this._installing;
      return;
    }
    this._installing = (async () => {
      // Install parent → children with host-created mounts at each entry's
      // effective namespace (async-aware).
      await setupPluginTree(this, this._plugins);
      this._installed = true;
    })();
    try {
      await this._installing;
    } finally {
      // leave _installing as resolved; subsequent calls return early via _installed
    }
  }

  /**
   * Run afterResolve hooks for registered plugins (parent → children).
   * When `commandPath` is provided, only the matching branch of the
   * plugin tree runs; otherwise all plugins run (backward compatibility).
   *
   * Each prefix of the command path is matched against the plugins'
   * realized mount paths (effective namespaces, override \> default), the
   * same paths that key config slices. Intermediate matches run their own
   * afterResolve hook. The deepest match runs afterResolve for itself and
   * all its descendants.
   *
   * @param ctx - The resolved host context passed to each hook.
   * @param commandPath - Command names from the root to the invoked command.
   */
  async _runAfterResolve(
    ctx: GetDotenvCliCtx<TOptions>,
    commandPath?: string[],
  ): Promise<void> {
    if (!commandPath || commandPath.length === 0) {
      await runAfterResolveTree(
        this,
        this._plugins.map((e) => e.plugin),
        ctx,
      );
      return;
    }

    // Match each command-path prefix against the realized mount paths.
    const byPath = new Map(
      flattenPluginTreeByPath(this._plugins).map((e) => [e.path, e.plugin]),
    );
    const chain: Array<GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>> =
      [];
    let path = '';
    for (const segment of commandPath) {
      path = joinRealizedPath(path, segment);
      const plugin = byPath.get(path);
      if (!plugin) break;
      chain.push(plugin);
    }
    const deepest = chain.pop();
    if (!deepest) return;

    // Intermediate matches: run only their own afterResolve.
    for (const plugin of chain) {
      if (plugin.afterResolve) await plugin.afterResolve(this, ctx);
    }
    // Deepest match: run this plugin + all its descendants.
    await runAfterResolveTree(this, [deepest], ctx);
  }
}
