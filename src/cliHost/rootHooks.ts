/** src/cliHost/rootHooks.ts
 * Internal helper to install root resolution hooks (preSubcommand/preAction).
 * Mirrors the wiring previously performed by GetDotenvCli.overrideRootOptions,
 * without exposing a public helper on the host class.
 */

import {
  resolveGetDotenvConfigSources,
  validateEnvAgainstSources,
} from '@/src/config';
import {
  getDotenvCliOptions2Options,
  type GetDotenvOptions,
  type RootOptionsShapeCompat,
} from '@/src/core';
import { baseRootOptionDefaults } from '@/src/defaults';
import { defaultsDeep } from '@/src/util';

import type { GetDotenvCli } from './GetDotenvCli';
import type { GetDotenvCliOptions } from './GetDotenvCliOptions';
import { toHelpConfig } from './helpConfig';
import { resolveCliOptions } from './resolveCliOptions';
import type { RootOptionsShape, ScriptsTable } from './types';

const dbg = (...args: unknown[]) => {
  if (process.env.GETDOTENV_DEBUG) {
    try {
      const line = args
        .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
        .join(' ');
      process.stderr.write(`[getdotenv:rootHooks] ${line}\n`);
    } catch {
      /* ignore */
    }
  }
};

// Typed projection for concise debug logs without unsafe member access.
const debugView = (o: Partial<RootOptionsShape>) => ({
  env: o.env,
  shell: o.shell,
  log: o.log,
  capture: o.capture,
  strict: o.strict,
});

export function installRootHooks<TOptions extends GetDotenvOptions>(
  program: GetDotenvCli<TOptions>,
  defaults?: Partial<RootOptionsShape>,
): GetDotenvCli<TOptions> {
  // Helper: compute merged root defaults from discovered config sources.
  const computeConfigRootDefaults = async (): Promise<
    Partial<RootOptionsShape>
  > => {
    try {
      const sources = await resolveGetDotenvConfigSources(import.meta.url);
      const merged = defaultsDeep<Partial<RootOptionsShape>>(
        {},
        (sources.packaged?.rootOptionDefaults as Partial<RootOptionsShape>) ??
          {},
        (sources.project?.public
          ?.rootOptionDefaults as Partial<RootOptionsShape>) ?? {},
        (sources.project?.local
          ?.rootOptionDefaults as Partial<RootOptionsShape>) ?? {},
      );
      return merged;
    } catch {
      return {} as Partial<RootOptionsShape>;
    }
  };

  // Hook: preSubcommand — always runs for subcommand flows.
  program.hook('preSubcommand', async (thisCommand) => {
    const rawArgs =
      (thisCommand as unknown as { rawArgs?: string[] }).rawArgs ?? [];
    dbg('preSubcommand:rawArgs', rawArgs);

    const raw =
      (thisCommand as { opts?: () => Record<string, unknown> }).opts?.() ?? {};

    // Build unified defaults stack for this run:
    // baseRootOptionDefaults < createCli root defaults (argument) < config.rootOptionDefaults
    const cfgDefaults = await computeConfigRootDefaults();
    const d = defaultsDeep<Partial<RootOptionsShape>>(
      baseRootOptionDefaults as Partial<RootOptionsShape>,
      defaults ?? {},
      cfgDefaults,
    );

    const { merged } = resolveCliOptions<
      RootOptionsShape & { scripts?: ScriptsTable }
    >(raw, d, process.env.getDotenvCliOptions);
    dbg('preSubcommand:merged', debugView(merged as Partial<RootOptionsShape>));

    // Persist merged bag for nested flows and ergonomic access.
    (
      thisCommand as unknown as {
        getDotenvCliOptions?: GetDotenvCliOptions;
      }
    ).getDotenvCliOptions = merged as unknown as GetDotenvCliOptions;
    (
      program as unknown as {
        _setOptionsBag: (b: GetDotenvCliOptions) => void;
      }
    )._setOptionsBag(merged as unknown as GetDotenvCliOptions);

    // Resolve context for this run via programmatic converter.
    const serviceOptions = getDotenvCliOptions2Options(
      merged as unknown as RootOptionsShapeCompat,
    ) as unknown as Partial<TOptions>;
    await program.resolveAndLoad(serviceOptions);

    // Refresh dynamic help text using the resolved config slices.
    try {
      const ctx = program.getCtx();
      const helpCfg = toHelpConfig(merged, ctx.pluginConfigs);
      program.evaluateDynamicOptions(helpCfg);
    } catch {
      /* best-effort */
    }

    // Global validation (once after overlays). Honor --strict.
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
        if ((merged as unknown as GetDotenvCliOptions).strict) process.exit(1);
      }
    } catch {
      /* tolerate non-strict flows */
    }
  });

  // Hook: preAction — root-only and parent-alias flows.
  program.hook('preAction', async (thisCommand) => {
    const rawArgs =
      (thisCommand as unknown as { rawArgs?: string[] }).rawArgs ?? [];
    dbg('preAction:rawArgs', rawArgs);
    const raw =
      (thisCommand as { opts?: () => Record<string, unknown> }).opts?.() ?? {};

    // Build unified defaults stack for this run:
    // baseRootOptionDefaults < createCli root defaults (argument) < config.rootOptionDefaults
    const cfgDefaults = await computeConfigRootDefaults();
    const d = defaultsDeep<Partial<RootOptionsShape>>(
      baseRootOptionDefaults as Partial<RootOptionsShape>,
      defaults ?? {},
      cfgDefaults,
    );

    const { merged } = resolveCliOptions<
      RootOptionsShape & { scripts?: ScriptsTable }
    >(raw, d, process.env.getDotenvCliOptions);
    dbg('preAction:merged', debugView(merged as Partial<RootOptionsShape>));

    (
      thisCommand as unknown as {
        getDotenvCliOptions?: GetDotenvCliOptions;
      }
    ).getDotenvCliOptions = merged as unknown as GetDotenvCliOptions;
    (
      program as unknown as {
        _setOptionsBag: (b: GetDotenvCliOptions) => void;
      }
    )._setOptionsBag(merged as unknown as GetDotenvCliOptions);

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
          if ((merged as unknown as GetDotenvCliOptions).strict)
            process.exit(1);
        }
      } catch {
        /* tolerate non-strict flows */
      }
    }
  });
  return program;
}
