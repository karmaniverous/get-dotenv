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
  // Hook: preSubcommand — always runs for subcommand flows.
  program.hook('preSubcommand', async (thisCommand) => {
    const sources = await resolveGetDotenvConfigSources(import.meta.url);
    const rawArgs =
      (thisCommand as unknown as { rawArgs?: string[] }).rawArgs ?? [];
    dbg('preSubcommand:rawArgs', rawArgs);

    const raw =
      (thisCommand as { opts?: () => Record<string, unknown> }).opts?.() ?? {};

    // Build unified defaults stack for this run:
    // baseRootOptionDefaults < createCli root defaults (argument) < config.rootOptionDefaults
    const cfgDefaults = defaultsDeep<Partial<RootOptionsShape>>(
      {},
      sources.packaged?.rootOptionDefaults ?? {},
      sources.project?.public?.rootOptionDefaults ?? {},
      sources.project?.local?.rootOptionDefaults ?? {},
    );
    const d = defaultsDeep<Partial<RootOptionsShape>>(
      baseRootOptionDefaults as Partial<RootOptionsShape>,
      defaults ?? {},
      cfgDefaults,
    );

    const { merged } = resolveCliOptions<
      RootOptionsShape & { scripts?: ScriptsTable }
    >(raw, d, process.env.getDotenvCliOptions);
    dbg('preSubcommand:merged', debugView(merged as Partial<RootOptionsShape>));

    // Inject merged scripts from config sources (packaged < project/public < project/local).
    (merged as unknown as Record<string, unknown>).scripts = defaultsDeep(
      {},
      (merged as unknown as { scripts?: ScriptsTable }).scripts ?? {},
      (sources.packaged?.scripts as ScriptsTable | undefined) ?? {},
      (sources.project?.public?.scripts as ScriptsTable | undefined) ?? {},
      (sources.project?.local?.scripts as ScriptsTable | undefined) ?? {},
    );

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
    const sources = await resolveGetDotenvConfigSources(import.meta.url);
    const rawArgs =
      (thisCommand as unknown as { rawArgs?: string[] }).rawArgs ?? [];
    dbg('preAction:rawArgs', rawArgs);
    const raw =
      (thisCommand as { opts?: () => Record<string, unknown> }).opts?.() ?? {};

    // Build unified defaults stack for this run:
    // baseRootOptionDefaults < createCli root defaults (argument) < config.rootOptionDefaults
    const cfgDefaults = defaultsDeep<Partial<RootOptionsShape>>(
      {},
      sources.packaged?.rootOptionDefaults ?? {},
      sources.project?.public?.rootOptionDefaults ?? {},
      sources.project?.local?.rootOptionDefaults ?? {},
    );
    const d = defaultsDeep<Partial<RootOptionsShape>>(
      baseRootOptionDefaults as Partial<RootOptionsShape>,
      defaults ?? {},
      cfgDefaults,
    );

    const { merged } = resolveCliOptions<
      RootOptionsShape & { scripts?: ScriptsTable }
    >(raw, d, process.env.getDotenvCliOptions);
    dbg('preAction:merged', debugView(merged as Partial<RootOptionsShape>));

    // Inject merged scripts from config sources (packaged < project/public < project/local).
    (merged as unknown as Record<string, unknown>).scripts = defaultsDeep(
      {},
      (merged as unknown as { scripts?: ScriptsTable }).scripts ?? {},
      (sources.packaged?.scripts as ScriptsTable | undefined) ?? {},
      (sources.project?.public?.scripts as ScriptsTable | undefined) ?? {},
      (sources.project?.local?.scripts as ScriptsTable | undefined) ?? {},
    );

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
