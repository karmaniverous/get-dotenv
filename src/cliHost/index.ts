export { z } from 'zod';
import { baseRootOptionDefaults } from '../cliCore/defaults';
import type { GetDotenvCliOptions } from '../cliCore/GetDotenvCliOptions';
import { resolveCliOptions } from '../cliCore/resolveCliOptions';
import type {
  CommandWithOptions,
  RootOptionsShape,
  ScriptsTable,
} from '../cliCore/types';
import { resolveGetDotenvConfigSources } from '../config/loader';
import { validateEnvAgainstSources } from '../config/validate';
import type {
  GetDotenvOptions,
  Logger,
  RootOptionsShapeCompat,
} from '../GetDotenvOptions';
import { getDotenvCliOptions2Options } from '../GetDotenvOptions';
import { defaultsDeep } from '../util/defaultsDeep';
import { attachRootOptions as attachRootOptionsBuilder } from './attachRootOptions';
import type { PluginWithInstanceHelpers as PluginWithInstanceHelpersType } from './definePlugin';
import { GetDotenvCli as BaseGetDotenvCli } from './GetDotenvCli';
import { toHelpConfig } from './helpConfig';

export type { DefineSpec, GetDotenvCliPlugin } from './definePlugin';
export type { GetDotenvCliPublic } from './definePlugin';
export type { PluginWithInstanceHelpers } from './definePlugin';
/**
 * Infer the compile-time plugin config type from a plugin instance created by definePlugin.
 * Returns a deeply readonly view to discourage mutation at call sites.
 */
export type InferPluginConfig<P> =
  P extends PluginWithInstanceHelpersType<GetDotenvOptions, infer C>
    ? Readonly<C>
    : never;
export { definePlugin } from './definePlugin';
export type { GetDotenvCliCtx } from './GetDotenvCli';
// Downstream-friendly type re-exports (single import path)
export type { GetDotenvCliOptions } from '../cliCore/GetDotenvCliOptions';
export type { ScriptsTable } from '../cliCore/types';

/**
 * GetDotenvCli with root helpers as real class methods.
 * - attachRootOptions: installs legacy/base root flags on the command.
 * - passOptions: merges flags (parent \< current), computes dotenv context once,
 *   runs validation, and persists merged options for nested flows.
 */
export class GetDotenvCli extends BaseGetDotenvCli {
  /**
   * Attach legacy root flags to this CLI instance. Defaults come from
   * baseRootOptionDefaults when none are provided.
   */
  attachRootOptions(defaults?: Partial<RootOptionsShape>): this {
    const d = (defaults ?? baseRootOptionDefaults) as Partial<RootOptionsShape>;
    attachRootOptionsBuilder(this, d);
    return this;
  }

  /**
   * Install preSubcommand/preAction hooks that:
   * - Merge options (parent round-trip + current invocation) using resolveCliOptions.
   * - Persist the merged bag on the current command and on the host (for ergonomics).
   * - Compute the dotenv context once via resolveAndLoad(serviceOptions).
   * - Validate the composed env against discovered config (warn or --strict fail).
   */
  passOptions(defaults?: Partial<RootOptionsShape>): this {
    // Merge provided defaults over the base root defaults so critical keys
    // (e.g., logger: console) are preserved unless explicitly overridden.
    const d = defaultsDeep<Partial<RootOptionsShape>>(
      baseRootOptionDefaults as Partial<RootOptionsShape>,
      defaults ?? {},
    );

    this.hook(
      'preSubcommand',
      async (thisCommand: CommandWithOptions<GetDotenvCliOptions>) => {
        const raw = thisCommand.opts();
        const { merged } = resolveCliOptions<
          RootOptionsShape & { scripts?: ScriptsTable }
        >(raw, d, process.env.getDotenvCliOptions);

        // Persist merged options (for nested behavior and ergonomic access).
        thisCommand.getDotenvCliOptions =
          merged as unknown as GetDotenvCliOptions;
        this._setOptionsBag(merged as unknown as GetDotenvCliOptions);

        // Build service options and compute context (always-on loader path).
        const serviceOptions = getDotenvCliOptions2Options(
          merged as unknown as RootOptionsShapeCompat,
        );
        await this.resolveAndLoad(serviceOptions);

        // Refresh dynamic option descriptions using resolved config + plugin slices
        try {
          const ctx = this.getCtx();
          const helpCfg = toHelpConfig(merged, ctx?.pluginConfigs);
          this.evaluateDynamicOptions(helpCfg);
        } catch {
          /* best-effort */
        }
        // Global validation: once after Phase C using config sources.
        try {
          const ctx = this.getCtx();
          const dotenv = ctx?.dotenv ?? {};
          const sources = await resolveGetDotenvConfigSources(import.meta.url);
          const issues = validateEnvAgainstSources(dotenv, sources);
          if (Array.isArray(issues) && issues.length > 0) {
            const logger: Logger = (merged as unknown as GetDotenvCliOptions)
              .logger;
            issues.forEach((m) => {
              logger.error(m);
            });
            if ((merged as { strict?: boolean }).strict) process.exit(1);
          }
        } catch {
          // Be tolerant: do not crash non-strict flows on unexpected validator failures.
        }
      },
    );

    // Also handle root-level flows (no subcommand) so option-aliases can run
    // with the same merged options and context without duplicating logic.
    this.hook(
      'preAction',
      async (thisCommand: CommandWithOptions<GetDotenvCliOptions>) => {
        const raw = thisCommand.opts();
        const { merged } = resolveCliOptions<
          RootOptionsShape & { scripts?: ScriptsTable }
        >(raw, d, process.env.getDotenvCliOptions);
        thisCommand.getDotenvCliOptions =
          merged as unknown as GetDotenvCliOptions;
        this._setOptionsBag(merged as unknown as GetDotenvCliOptions);
        // Avoid duplicate heavy work if a context is already present.
        if (!this.getCtx()) {
          const serviceOptions = getDotenvCliOptions2Options(
            merged as unknown as RootOptionsShapeCompat,
          );
          await this.resolveAndLoad(serviceOptions);
          try {
            const ctx = this.getCtx();
            const helpCfg = toHelpConfig(merged, ctx?.pluginConfigs);
            this.evaluateDynamicOptions(helpCfg);
          } catch {
            /* tolerate */
          }
          try {
            const ctx = this.getCtx();
            const dotenv = (ctx?.dotenv ?? {}) as Record<
              string,
              string | undefined
            >;
            const sources = await resolveGetDotenvConfigSources(
              import.meta.url,
            );
            const issues = validateEnvAgainstSources(dotenv, sources);
            if (Array.isArray(issues) && issues.length > 0) {
              const logger: Logger = (merged as unknown as GetDotenvCliOptions)
                .logger;
              issues.forEach((m) => {
                logger.error(m);
              });
              if ((merged as { strict?: boolean }).strict) {
                process.exit(1);
              }
            }
          } catch {
            // Tolerate validation side-effects in non-strict mode.
          }
        }
      },
    );
    return this;
  }
}
