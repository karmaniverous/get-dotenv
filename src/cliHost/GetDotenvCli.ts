import { Command } from 'commander';

// NOTE: host class kept thin; heavy context computation lives in computeContext.
import {
  type GetDotenvOptions,
  resolveGetDotenvOptions,
} from '../GetDotenvOptions';
import { getDotenvOptionsSchemaResolved } from '../schema/getDotenvOptions';
import { computeContext } from './computeContext';
import type { GetDotenvCliPlugin } from './definePlugin';

/** * Per-invocation context shared with plugins and actions. */
export type GetDotenvCliCtx = {
  optionsResolved: GetDotenvOptions;
  dotenv: Record<string, string | undefined>;
  plugins?: Record<string, unknown>;
  pluginConfigs?: Record<string, unknown>;
};

const HOST_META_URL = import.meta.url;

const CTX_SYMBOL = Symbol('GetDotenvCli.ctx');

/**
 * Plugin-first CLI host for get-dotenv. Extends Commander.Command.
 *
 * Responsibilities:
 * - Resolve options strictly and compute dotenv context (resolveAndLoad).
 * - Expose a stable accessor for the current context (getCtx).
 * - Provide a namespacing helper (ns).
 * - Support composable plugins with parent → children install and afterResolve.
 *
 * NOTE: This host is additive and does not alter the legacy CLI.
 */
export class GetDotenvCli extends Command {
  /** Registered top-level plugins (composition happens via .use()) */
  private _plugins: GetDotenvCliPlugin[] = [];
  /** One-time installation guard */
  private _installed = false;

  constructor(alias = 'getdotenv') {
    super(alias);
    // Ensure subcommands that use passThroughOptions can be attached safely.
    // Commander requires parent commands to enable positional options when a
    // child uses passThroughOptions.
    this.enablePositionalOptions();
    // Skeleton preSubcommand hook: produce context if absent.
    this.hook('preSubcommand', async () => {
      if (this.getCtx()) return;
      await this.resolveAndLoad({});
    });
  }

  /**
   * Resolve options (strict) and compute dotenv context.
   * Stores the context on the instance under a symbol.
   */
  async resolveAndLoad(
    customOptions: Partial<GetDotenvOptions> = {},
  ): Promise<GetDotenvCliCtx> {
    // Resolve defaults, then validate strictly under the new host.
    const optionsResolved = await resolveGetDotenvOptions(customOptions);
    getDotenvOptionsSchemaResolved.parse(optionsResolved);

    // Delegate the heavy lifting to the shared helper (guarded path supported).
    const ctx = await computeContext(
      optionsResolved,
      this._plugins,
      HOST_META_URL,
    );

    // Persist context on the instance for later access.
    (this as unknown as Record<symbol, GetDotenvCliCtx>)[CTX_SYMBOL] = ctx;

    // Ensure plugins are installed exactly once, then run afterResolve.
    await this.install();
    await this._runAfterResolve(ctx);

    return ctx;
  }

  /**
   * Retrieve the current invocation context (if any).
   */
  getCtx(): GetDotenvCliCtx | undefined {
    return (this as unknown as Record<symbol, GetDotenvCliCtx>)[CTX_SYMBOL];
  }

  /**
   * Convenience helper to create a namespaced subcommand.
   */
  ns(name: string): Command {
    return this.command(name);
  }

  /**
   * Register a plugin for installation (parent level).
   * Installation occurs on first resolveAndLoad() (or explicit install()).
   */
  use(plugin: GetDotenvCliPlugin): this {
    this._plugins.push(plugin);
    // Immediately run setup so subcommands exist before parsing.
    const setupOne = (p: GetDotenvCliPlugin) => {
      const maybe = p.setup(this);
      // Best-effort: ignore async completion for registration-only setup.
      void maybe;
      for (const child of p.children) setupOne(child);
    };
    setupOne(plugin);
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
  private async _runAfterResolve(ctx: GetDotenvCliCtx): Promise<void> {
    const run = async (p: GetDotenvCliPlugin) => {
      if (p.afterResolve) await p.afterResolve(this, ctx);
      for (const child of p.children) await run(child);
    };
    for (const p of this._plugins) await run(p);
  }
}
