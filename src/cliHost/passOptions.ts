/** src/cliHost/passOptions.ts
 * Install preSubcommand/preAction hooks that:
 * - Merge options (parent round-trip + current invocation).
 * - Persist the merged bag (root + current) on the host.
 * - Resolve the dotenv context once via resolveAndLoad(serviceOptions).
 * - Refresh dynamic help.
 * - Validate composed env (warn or --strict fail).
 */
import { resolveGetDotenvConfigSources } from '@/src/config/loader';
import { validateEnvAgainstSources } from '@/src/config/validate';
import type { RootOptionsShapeCompat } from '@/src/GetDotenvOptions';
import type { GetDotenvOptions } from '@/src/GetDotenvOptions';
import { getDotenvCliOptions2Options } from '@/src/GetDotenvOptions';
import { defaultsDeep } from '@/src/util/defaultsDeep';

import { baseRootOptionDefaults } from './defaults';
import type { GetDotenvCli } from './GetDotenvCli';
import type { GetDotenvCliOptions } from './GetDotenvCliOptions';
import { toHelpConfig } from './helpConfig';
import { resolveCliOptions } from './resolveCliOptions';
import type {
  CommandWithOptions,
  RootOptionsShape,
  ScriptsTable,
} from './types';

export function installPassOptions<TOptions extends GetDotenvOptions>(
  program: GetDotenvCli<TOptions>,
  defaults?: Partial<RootOptionsShape>,
): GetDotenvCli<TOptions> {
  // Ensure plugins are installed before Commander parses argv, so parent-level
  // options (e.g., --cmd) and namespaced subcommands are available during
  // option/command validation. Setup is synchronous for shipped plugins; if a
  // plugin provides an async setup, install() awaits during resolveAndLoad().
  // Here we fire-and-forget to register static surfaces early.
  void program.install();
  // Merge provided defaults over the base root defaults so critical keys
  // (e.g., logger: console) are preserved unless explicitly overridden.
  const d = defaultsDeep<Partial<RootOptionsShape>>(
    baseRootOptionDefaults as Partial<RootOptionsShape>,
    defaults ?? {},
  );

  program.hook(
    'preSubcommand',
    async (thisCommand: CommandWithOptions<GetDotenvCliOptions>) => {
      const raw = thisCommand.opts();
      const { merged } = resolveCliOptions<
        RootOptionsShape & { scripts?: ScriptsTable }
      >(raw, d, process.env.getDotenvCliOptions);

      // Persist merged options (for nested behavior and ergonomic access).
      thisCommand.getDotenvCliOptions =
        merged as unknown as GetDotenvCliOptions;
      (program as unknown as GetDotenvCli)._setOptionsBag(
        merged as unknown as GetDotenvCliOptions,
      );

      // Build service options and compute context (always-on loader path).
      const serviceOptions = getDotenvCliOptions2Options(
        merged as unknown as RootOptionsShapeCompat,
      ) as unknown as Partial<TOptions>;
      await program.resolveAndLoad(serviceOptions);

      // Refresh dynamic option descriptions using resolved config + plugin slices.
      try {
        const ctx = program.getCtx();
        const helpCfg = toHelpConfig(merged, ctx.pluginConfigs);
        program.evaluateDynamicOptions(helpCfg);
      } catch {
        /* best-effort */
      }

      // Global validation: once after Phase C using config sources.
      try {
        const ctx = program.getCtx();
        const dotenv = ctx.dotenv;
        const sources = await resolveGetDotenvConfigSources(import.meta.url);
        const issues = validateEnvAgainstSources(dotenv, sources);
        if (Array.isArray(issues) && issues.length > 0) {
          const logger = (merged as unknown as GetDotenvCliOptions).logger;
          issues.forEach((m) => {
            logger.error(m);
          });
          if (merged.strict) process.exit(1);
        }
      } catch {
        // Be tolerant: do not crash non-strict flows on unexpected validator failures.
      }
    },
  );

  // Root-level flows (no subcommand): option-alias paths require the same behavior.
  program.hook(
    'preAction',
    async (thisCommand: CommandWithOptions<GetDotenvCliOptions>) => {
      const raw = thisCommand.opts();
      const { merged } = resolveCliOptions<
        RootOptionsShape & { scripts?: ScriptsTable }
      >(raw, d, process.env.getDotenvCliOptions);
      thisCommand.getDotenvCliOptions =
        merged as unknown as GetDotenvCliOptions;
      (program as unknown as GetDotenvCli)._setOptionsBag(
        merged as unknown as GetDotenvCliOptions,
      );
      // Avoid duplicate heavy work if a context is already present.
      if (!program.hasCtx()) {
        const serviceOptions = getDotenvCliOptions2Options(
          merged as unknown as RootOptionsShapeCompat,
        ) as unknown as Partial<TOptions>;
        await program.resolveAndLoad(serviceOptions);
        try {
          const ctx = program.getCtx();
          const helpCfg = toHelpConfig(merged, ctx.pluginConfigs);
          program.evaluateDynamicOptions(helpCfg);
        } catch {
          /* tolerate */
        }
        try {
          const ctx = program.getCtx();
          const dotenv = ctx.dotenv;
          const sources = await resolveGetDotenvConfigSources(import.meta.url);
          const issues = validateEnvAgainstSources(dotenv, sources);
          if (Array.isArray(issues) && issues.length > 0) {
            const logger = (merged as unknown as GetDotenvCliOptions).logger;
            issues.forEach((m) => {
              logger.error(m);
            });
            if (merged.strict) {
              process.exit(1);
            }
          }
        } catch {
          // Tolerate validation side-effects in non-strict mode.
        }
      }
    },
  );
  return program;
}
