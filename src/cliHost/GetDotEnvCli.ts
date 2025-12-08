import type { Option } from '@commander-js/extra-typings';
import type {
  CommandUnknownOpts,
  InferCommandArguments,
  OptionValues,
} from '@commander-js/extra-typings';
import { Command } from '@commander-js/extra-typings';

import type {
  GetDotenvCliPlugin,
  GetDotenvCliPublic,
} from '@/src/cliHost/definePlugin';
import type { GetDotenvCliOptions } from '@/src/cliHost/GetDotenvCliOptions';
// Added: helpers and types for root wiring and validation
import type { ProcessEnv } from '@/src/GetDotenvOptions';
import { type GetDotenvOptions } from '@/src/GetDotenvOptions';

// New: small helpers to keep the class lean
import { attachRootOptions as attachRootOptionsBuilder } from './attachRootOptions';
import { buildHelpInformation } from './buildHelpInformation';
import { baseRootOptionDefaults } from './defaults';
import {
  evaluateDynamicOptions as evalDyn,
  makeDynamicOption,
} from './dynamicOptions';
import { GROUP_TAG } from './groups';
import { initializeInstance } from './initializeInstance';
import { installPassOptions } from './passOptions';
import { setupPluginTree } from './registerPlugin';
import { resolveAndComputeContext } from './resolveAndComputeContext';
import { runAfterResolveTree } from './runAfterResolve';
import { tagAppOptionsAround } from './tagAppOptionsHelper';
import type { RootOptionsShape } from './types';
import { readPkgVersion } from './version';

export type ResolvedHelpConfig = Partial<GetDotenvCliOptions> & {
  plugins: Record<string, unknown>;
};

/** Per-invocation context shared with plugins and actions. */
export type GetDotenvCliCtx<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
> = {
  optionsResolved: TOptions;
  dotenv: ProcessEnv;
  plugins?: Record<string, unknown>;
  pluginConfigs?: Record<string, unknown>;
};

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
  private _plugins: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>[] = [];
  /** One-time installation guard */
  private _installed = false;
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
   */
  attachRootOptions(defaults?: Partial<RootOptionsShape>): this {
    const d = (defaults ?? baseRootOptionDefaults) as Partial<RootOptionsShape>;
    // Delegate to the existing builder; keep method minimal.
    attachRootOptionsBuilder(this as unknown as GetDotenvCli, d);
    return this;
  }

  /**
   * Persist merged root options, resolve context once, refresh dynamic help, and validate.
   * Installs both preSubcommand and preAction hooks via a small helper module.
   */
  passOptions(defaults?: Partial<RootOptionsShape>): this {
    installPassOptions(this as unknown as GetDotenvCli, defaults);
    return this;
  }

  /**
   * Resolve options (strict) and compute dotenv context.
   * Stores the context on the instance under a symbol.
   *
   * Options:
   * - opts.runAfterResolve (default true): when false, skips running plugin
   *   afterResolve hooks. Useful for top-level help rendering to avoid
   *   long-running side-effects while still evaluating dynamic help text.
   */
  async resolveAndLoad(
    customOptions: Partial<TOptions> = {},
    opts?: { runAfterResolve?: boolean },
  ): Promise<GetDotenvCliCtx<TOptions>> {
    const ctx = await resolveAndComputeContext<TOptions, TArgs, TOpts, TGlobal>(
      customOptions,
      this._plugins,
      HOST_META_URL,
    );

    // Persist context on the instance for later access.
    this[CTX_SYMBOL] = ctx;

    // Ensure plugins are installed exactly once, then run afterResolve.
    await this.install();
    if (opts?.runAfterResolve ?? true) {
      await this._runAfterResolve(ctx);
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
  // Implementation
  createDynamicOption<Usage extends string>(
    flags: Usage,
    desc: (
      cfg: ResolvedHelpConfig & { plugins: Record<string, unknown> },
    ) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): Option<Usage> {
    return makeDynamicOption(
      flags,
      (c) => desc(c as ResolvedHelpConfig),
      parser,
      defaultValue,
    );
  }

  /**
   * Chainable helper mirroring .option(), but with a dynamic description.
   * Equivalent to addOption(createDynamicOption(...)).
   */
  dynamicOption<Usage extends string>(
    flags: Usage,
    desc: (
      cfg: ResolvedHelpConfig & { plugins: Record<string, unknown> },
    ) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): this {
    this.addOption(
      this.createDynamicOption<Usage>(flags, desc, parser, defaultValue),
    );
    return this;
  }

  /**
   * Evaluate dynamic descriptions for this command and all descendants using
   * the provided resolved configuration. Mutates the Option.description in
   * place so Commander help renders updated text.
   */
  evaluateDynamicOptions(resolved: ResolvedHelpConfig): void {
    evalDyn(this, resolved);
  }

  /**
   * Retrieve the current invocation context (if any).
   */
  getCtx(): GetDotenvCliCtx<TOptions> {
    const ctx = this[CTX_SYMBOL];
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
    return this[CTX_SYMBOL] !== undefined;
  }

  /**
   * Retrieve the merged root CLI options bag (if set by passOptions()).
   * Downstream-safe: no generics required.
   */
  getOptions(): GetDotenvCliOptions | undefined {
    return this[OPTS_SYMBOL];
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
    return this.command(name) as unknown as GetDotenvCliPublic<
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
  async brand(args: {
    name?: string;
    description?: string;
    version?: string;
    importMetaUrl?: string;
    helpHeader?: string;
  }): Promise<this> {
    const { name, description, version, importMetaUrl, helpHeader } = args;
    if (typeof name === 'string' && name.length > 0) this.name(name);
    if (typeof description === 'string') this.description(description);
    const v = version ?? (await readPkgVersion(importMetaUrl));
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
   */
  use(plugin: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>): this {
    this._plugins.push(plugin);
    setupPluginTree(this, plugin);
    return this;
  }

  /**
   * Install all registered plugins in parent → children (pre-order).
   * Runs only once per CLI instance.
   */
  async install(): Promise<void> {
    // Setup is performed immediately in use(); here we only guard for afterResolve.
    this._installed = true;
    // Satisfy require-await without altering behavior.
    await Promise.resolve();
  }

  /**
   * Run afterResolve hooks for all plugins (parent → children).
   */
  private async _runAfterResolve(
    ctx: GetDotenvCliCtx<TOptions>,
  ): Promise<void> {
    await runAfterResolveTree(this, this._plugins, ctx);
  }
}
