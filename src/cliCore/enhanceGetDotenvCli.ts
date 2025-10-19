import type { Command as CommanderCommand } from 'commander';

import { GetDotenvCli } from '../cliHost/GetDotenvCli';
import { resolveGetDotenvConfigSources } from '../config/loader';
import { validateEnvAgainstSources } from '../config/validate';
import { getDotenvCliOptions2Options } from '../GetDotenvOptions';
import { attachRootOptions } from './attachRootOptions';
import { baseRootOptionDefaults } from './defaults';
import type { GetDotenvCliOptions } from './GetDotenvCliOptions';
import { resolveCliOptions } from './resolveCliOptions';
import type { CommandWithOptions, RootOptionsShape } from './types'; /**
 * Adapter-layer augmentation: add chainable helpers to GetDotenvCli without
 * coupling the core host to cliCore. Importing this module has side effects:
 * it extends the prototype and merges types for consumers.
 */
declare module '../cliHost/GetDotenvCli' {
  interface GetDotenvCli {
    /**
     * Attach legacy root flags to this CLI instance. Defaults come from
     * baseRootOptionDefaults when none are provided.     */
    attachRootOptions(
      defaults?: Partial<RootOptionsShape>,
      opts?: { includeCommandOption?: boolean },
    ): this;
    /**
     * Install a preSubcommand hook that merges CLI flags (including parent
     * round-trip) and resolves the dotenv context before executing actions.
     * Defaults come from baseRootOptionDefaults when none are provided.
     */ passOptions(defaults?: Partial<RootOptionsShape>): this;
  }
}

GetDotenvCli.prototype.attachRootOptions = function (
  this: GetDotenvCli,
  defaults?: Partial<RootOptionsShape>,
  opts?: { includeCommandOption?: boolean },
) {
  const d = (defaults ?? baseRootOptionDefaults) as Partial<RootOptionsShape>;
  attachRootOptions(this as unknown as CommanderCommand, d, opts);
  return this;
};
GetDotenvCli.prototype.passOptions = function (
  this: GetDotenvCli,
  defaults?: Partial<RootOptionsShape>,
) {
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

      // Persist merged options for nested invocations (batch exec).
      thisCommand.getDotenvCliOptions =
        merged as unknown as GetDotenvCliOptions;
      // Also store on the host for downstream ergonomic accessors.
      (this as unknown as GetDotenvCli)._setOptionsBag(
        merged as unknown as GetDotenvCliOptions,
      );

      // Build service options and compute context (always-on config loader path).
      const serviceOptions = getDotenvCliOptions2Options(merged);
      await this.resolveAndLoad(serviceOptions);
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
          const logger = ((merged as unknown as { logger?: unknown }).logger ??
            console) as {
            log: (...a: unknown[]) => void;
            error?: (...a: unknown[]) => void;
          };
          const emit = logger.error ?? logger.log;
          issues.forEach((m) => {
            emit(m);
          });
          if ((merged as unknown as { strict?: boolean }).strict) {
            // Deterministic failure under strict mode
            process.exit(1);
          }
        }
      } catch {
        // Be tolerant: validation errors reported above; unexpected failures here
        // should not crash non-strict flows.
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
      (this as unknown as GetDotenvCli)._setOptionsBag(
        merged as unknown as GetDotenvCliOptions,
      );
      // Avoid duplicate heavy work if a context is already present.
      if (!this.getCtx()) {
        const serviceOptions = getDotenvCliOptions2Options(merged);
        await this.resolveAndLoad(serviceOptions);
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
          // Tolerate validation side-effects in non-strict mode
        }
      }
    },
  );
  return this;
};
