import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';

import { resolveGetDotenvConfigSources } from '../config/loader';
import { overlayEnv } from '../env/overlay';
import { getDotenv } from '../getDotenv';
import {
  type GetDotenvDynamic,
  type GetDotenvOptions,
  type Logger,
  type ProcessEnv,
  resolveGetDotenvOptions,
} from '../GetDotenvOptions';
import { getDotenvOptionsSchemaResolved } from '../schema/getDotenvOptions';
import { loadModuleDefault } from '../util/loadModuleDefault';
import type { GetDotenvCliPlugin } from './definePlugin';

/** * Per-invocation context shared with plugins and actions.
 */
export type GetDotenvCliCtx = {
  optionsResolved: GetDotenvOptions;
  dotenv: ProcessEnv;
  plugins?: Record<string, unknown>;
};

const HOST_META_URL = import.meta.url;

const CTX_SYMBOL = Symbol('GetDotenvCli.ctx');
/**
 * Plugin-first CLI host for get-dotenv. Extends Commander.Command. *
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
    // Resolve defaults, then validate strictly under the new host.
    const optionsResolved = await resolveGetDotenvOptions(customOptions);
    const validated = getDotenvOptionsSchemaResolved.parse(optionsResolved);
    let dotenv: ProcessEnv;

    // Guarded integration: when enabled, use config loader + overlay + dynamics.
    if (
      (validated as unknown as { useConfigLoader?: boolean }).useConfigLoader
    ) {
      // 1) Compute base from files only (no dynamic, no programmatic vars)
      const base = await getDotenv({
        ...validated,
        excludeDynamic: true,
        // Omit programmatic vars at this stage
        vars: {},
      } as unknown as Partial<GetDotenvOptions>);

      // 2) Discover config sources and overlay
      const sources = await resolveGetDotenvConfigSources(HOST_META_URL);
      const overlaid = overlayEnv({
        base,
        env: validated.env ?? validated.defaultEnv,
        configs: sources,
        // exactOptionalPropertyTypes: only include when defined
        ...(validated.vars ? { programmaticVars: validated.vars } : {}),
      });

      // 3) Apply dynamics in order:
      //    programmatic dynamic > config dynamic (packaged -> project.public -> project.local) > file dynamicPath
      dotenv = { ...overlaid };
      const applyDynamic = (
        target: ProcessEnv,
        dynamic: GetDotenvDynamic | undefined,
        env: string | undefined,
      ) => {
        if (!dynamic) return;
        for (const key of Object.keys(dynamic)) {
          const value =
            typeof dynamic[key] === 'function'
              ? (
                  dynamic[key] as (
                    v: ProcessEnv,
                    e?: string,
                  ) => string | undefined
                )(target, env)
              : dynamic[key];
          Object.assign(target, { [key]: value });
        }
      };
      // programmatic dynamic
      applyDynamic(
        dotenv,
        (validated as unknown as { dynamic?: GetDotenvDynamic }).dynamic,
        validated.env ?? validated.defaultEnv,
      );
      // config dynamic from JS/TS (packaged -> project public -> project local)
      applyDynamic(
        dotenv,
        (sources.packaged?.dynamic ?? undefined) as
          | GetDotenvDynamic
          | undefined,
        validated.env ?? validated.defaultEnv,
      );
      applyDynamic(
        dotenv,
        (sources.project?.public?.dynamic ?? undefined) as
          | GetDotenvDynamic
          | undefined,
        validated.env ?? validated.defaultEnv,
      );
      applyDynamic(
        dotenv,
        (sources.project?.local?.dynamic ?? undefined) as
          | GetDotenvDynamic
          | undefined,
        validated.env ?? validated.defaultEnv,
      );
      // file dynamicPath (lowest)
      if (validated.dynamicPath) {
        const absDynamicPath = path.resolve(validated.dynamicPath);
        try {
          const dyn = await loadModuleDefault<GetDotenvDynamic>(
            absDynamicPath,
            'getdotenv-dynamic-host',
          );
          applyDynamic(dotenv, dyn, validated.env ?? validated.defaultEnv);
        } catch {
          throw new Error(
            `Unable to load dynamic from ${validated.dynamicPath}`,
          );
        }
      } // 4) Write output file if requested
      if (validated.outputPath) {
        await fs.writeFile(
          validated.outputPath,
          Object.keys(dotenv).reduce((contents, key) => {
            const value = dotenv[key] ?? '';
            return `${contents}${key}=${
              value.includes('\n') ? `"${value}"` : value
            }\n`;
          }, ''),
          { encoding: 'utf-8' },
        );
      }
      // 5) Log and process.env merge
      const logger: Logger =
        (validated as unknown as { logger?: Logger }).logger ?? console;
      if (validated.log) logger.log(dotenv);
      if (validated.loadProcess) Object.assign(process.env, dotenv);
    } else {
      // Legacy-safe path via getDotenv (unchanged)
      dotenv = await getDotenv(
        validated as unknown as Partial<GetDotenvOptions>,
      );
    }

    const ctx: GetDotenvCliCtx = {
      optionsResolved: validated as unknown as GetDotenvOptions,
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
   */ private async _runAfterResolve(ctx: GetDotenvCliCtx): Promise<void> {
    const run = async (p: GetDotenvCliPlugin) => {
      if (p.afterResolve) await p.afterResolve(this, ctx);
      for (const child of p.children) await run(child);
    };
    for (const p of this._plugins) await run(p);
  }
}
