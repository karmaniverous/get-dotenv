import { Command } from 'commander';

import { getDotenv } from '../getDotenv';
import {
  type GetDotenvOptions,
  type ProcessEnv,
  resolveGetDotenvOptions,
} from '../GetDotenvOptions';
import type { GetDotenvCliPlugin } from './definePlugin';

/**
 * Per-invocation context shared with plugins and actions.
 */
export type GetDotenvCliCtx = {
  optionsResolved: GetDotenvOptions;
  dotenv: ProcessEnv;
  plugins?: Record<string, unknown>;
};

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
    // Skeleton preSubcommand hook: produce context if absent.
    this.hook('preSubcommand', async () => {
      // If a context already exists for this invocation, do nothing.
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
    const optionsResolved = await resolveGetDotenvOptions(customOptions);
    const dotenv = await getDotenv(optionsResolved);

    const ctx: GetDotenvCliCtx = {
      optionsResolved,
      dotenv,
      plugins: {},
    };

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
    return this;
  }

  /**
   * Install all registered plugins in parent → children (pre-order).
   * Runs only once per CLI instance.
   */
  async install(): Promise<void> {
    if (this._installed) return;
    const installOne = async (p: GetDotenvCliPlugin) => {
      await p.setup(this);
      for (const child of p.children) await installOne(child);
    };
    for (const p of this._plugins) await installOne(p);
    this._installed = true;
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
