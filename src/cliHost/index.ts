import type { Command } from 'commander';

import { baseRootOptionDefaults } from '../cliCore/defaults';
import type { GetDotenvCliOptions } from '../cliCore/GetDotenvCliOptions';
import { resolveCliOptions } from '../cliCore/resolveCliOptions';
import type { CommandWithOptions, RootOptionsShape } from '../cliCore/types';
import { resolveGetDotenvConfigSources } from '../config/loader';
import { validateEnvAgainstSources } from '../config/validate';
import { getDotenvCliOptions2Options } from '../GetDotenvOptions';
import { attachRootOptions as attachRootOptionsBuilder } from './attachRootOptions';
import type { ResolvedHelpConfig } from './GetDotenvCli';
import { GetDotenvCli as BaseGetDotenvCli } from './GetDotenvCli';

export type { DefineSpec, GetDotenvCliPlugin } from './definePlugin';
export type { GetDotenvCliPublic } from './definePlugin';
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
  attachRootOptions(
    defaults?: Partial<RootOptionsShape>,
    opts?: { includeCommandOption?: boolean },
  ): this {
    const d = (defaults ?? baseRootOptionDefaults) as Partial<RootOptionsShape>;
    attachRootOptionsBuilder(this as unknown as Command, d, opts);
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
    const d = (defaults ?? baseRootOptionDefaults) as Partial<RootOptionsShape>;

    this.hook(
      'preSubcommand',
      async (thisCommand: CommandWithOptions<GetDotenvCliOptions>) => {
        const raw = thisCommand.opts();
        const { merged } = resolveCliOptions<GetDotenvCliOptions>(
          raw as unknown,
          d as Partial<GetDotenvCliOptions>,
          process.env.getDotenvCliOptions,
        );

        // Persist merged options (for nested behavior and ergonomic access).
        thisCommand.getDotenvCliOptions =
          merged as unknown as GetDotenvCliOptions;
        (this as unknown as BaseGetDotenvCli)._setOptionsBag(
          merged as unknown as GetDotenvCliOptions,
        );

        // Build service options and compute context (always-on loader path).
        const serviceOptions = getDotenvCliOptions2Options(merged);
        await this.resolveAndLoad(serviceOptions);

        // Refresh dynamic option descriptions using resolved config + plugin slices
        try {
          const ctx = this.getCtx();
          (this as unknown as BaseGetDotenvCli).evaluateDynamicOptions({
            ...(ctx?.optionsResolved as unknown as Record<string, unknown>),
            plugins: ctx?.pluginConfigs ?? {},
          } as unknown as ResolvedHelpConfig);
        } catch {
          /* best-effort */
        }
        // Global validation: once after Phase C using config sources.
        try {
          const ctx = this.getCtx();
          const dotenv = (ctx?.dotenv ?? {}) as Record<
            string,
            string | undefined
          >;
          const sources = await resolveGetDotenvConfigSources(import.meta.url);
          const issues = validateEnvAgainstSources(dotenv, sources);
          if (Array.isArray(issues) && issues.length > 0) {
            const logger = ((merged as unknown as { logger?: unknown })
              .logger ?? console) as {
              log: (...a: unknown[]) => void;
              error?: (...a: unknown[]) => void;
            };
            const emit = logger.error ?? logger.log;
            issues.forEach((m) => {
              emit(m);
            });
            if ((merged as unknown as { strict?: boolean }).strict) {
              process.exit(1);
            }
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
        const { merged } = resolveCliOptions<GetDotenvCliOptions>(
          raw as unknown,
          d as Partial<GetDotenvCliOptions>,
          process.env.getDotenvCliOptions,
        );
        thisCommand.getDotenvCliOptions =
          merged as unknown as GetDotenvCliOptions;
        (this as unknown as BaseGetDotenvCli)._setOptionsBag(
          merged as unknown as GetDotenvCliOptions,
        );
        // Avoid duplicate heavy work if a context is already present.
        if (!this.getCtx()) {
          const serviceOptions = getDotenvCliOptions2Options(merged);
          await this.resolveAndLoad(serviceOptions);
          try {
            const ctx = this.getCtx();
            (this as unknown as BaseGetDotenvCli).evaluateDynamicOptions({
              ...(ctx?.optionsResolved as unknown as Record<string, unknown>),
              plugins: ctx?.pluginConfigs ?? {},
            } as unknown as ResolvedHelpConfig);
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
              const logger = ((merged as unknown as { logger?: unknown })
                .logger ?? console) as {
                log: (...a: unknown[]) => void;
                error?: (...a: unknown[]) => void;
              };
              const emit = logger.error ?? logger.log;
              issues.forEach((m) => {
                emit(m);
              });
              if ((merged as unknown as { strict?: boolean }).strict) {
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

/**
 * Helper to retrieve the merged root options bag from any action handler
 * that only has access to thisCommand. Avoids structural casts.
 */
export const readMergedOptions = (
  cmd: Command,
): GetDotenvCliOptions | undefined => {
  // Ascend to the root command
  let root: Command = cmd;
  while ((root as unknown as { parent?: Command }).parent) {
    root = (root as unknown as { parent?: Command }).parent as Command;
  }
  const hostAny = root as unknown as { getOptions?: () => unknown };
  return typeof hostAny.getOptions === 'function'
    ? (hostAny.getOptions() as GetDotenvCliOptions)
    : ((root as unknown as { getDotenvCliOptions?: unknown })
        .getDotenvCliOptions as GetDotenvCliOptions | undefined);
};
