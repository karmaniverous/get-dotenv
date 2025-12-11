/** src/cliHost/rootHooks.ts
 * Internal helper to install root resolution hooks (preSubcommand/preAction).
 * Mirrors the wiring previously performed by GetDotenvCli.overrideRootOptions,
 * without exposing a public helper on the host class.
 */
import type { OptionValues } from '@commander-js/extra-typings';

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

type AnyGetDotenvCli<TOptions extends GetDotenvOptions> = GetDotenvCli<
  TOptions,
  unknown[],
  OptionValues,
  OptionValues
>;

export function installRootHooks<TOptions extends GetDotenvOptions>(
  program: AnyGetDotenvCli<TOptions>,
  defaults?: Partial<RootOptionsShape>,
): AnyGetDotenvCli<TOptions> {
  // Merge provided defaults over the base defaults to keep critical keys like logger.
  const d = defaultsDeep<Partial<RootOptionsShape>>(
    baseRootOptionDefaults as Partial<RootOptionsShape>,
    defaults ?? {},
  );

  // Hook: preSubcommand — always runs for subcommand flows.
  program.hook('preSubcommand', async (thisCommand) => {
    const rawArgs =
      (thisCommand as unknown as { rawArgs?: string[] }).rawArgs ?? [];
    dbg('preSubcommand:rawArgs', rawArgs);

    const raw =
      (thisCommand as { opts?: () => Record<string, unknown> }).opts?.() ?? {};

    const { merged } = resolveCliOptions<
      RootOptionsShape & { scripts?: ScriptsTable }
    >(raw, d, process.env.getDotenvCliOptions);
    dbg(
      'preSubcommand:merged',
      ((pick) => pick(merged as Record<string, unknown>))(
        (obj) =>
          ({
            env: obj.env,
            shell: obj.shell,
            log: obj.log,
            capture: obj.capture,
            strict: obj.strict,
          }) as Record<string, unknown>,
      ),
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
    const rawArgs =
      (thisCommand as unknown as { rawArgs?: string[] }).rawArgs ?? [];
    dbg('preAction:rawArgs', rawArgs);
    const raw =
      (thisCommand as { opts?: () => Record<string, unknown> }).opts?.() ?? {};

    const { merged } = resolveCliOptions<
      RootOptionsShape & { scripts?: ScriptsTable }
    >(raw, d, process.env.getDotenvCliOptions);
    dbg(
      'preAction:merged',
      ((pick) => pick(merged as Record<string, unknown>))(
        (obj) =>
          ({
            env: obj.env,
            shell: obj.shell,
            log: obj.log,
            capture: obj.capture,
            strict: obj.strict,
          }) as Record<string, unknown>,
      ),
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
