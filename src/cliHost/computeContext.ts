import fs from 'fs-extra';
import path from 'path';

import { resolveGetDotenvConfigSources } from '../config/loader';
import { overlayEnv } from '../env/overlay';
import { getDotenv } from '../getDotenv';
import type { ProcessEnv } from '../GetDotenvOptions';
import {
  type GetDotenvDynamic,
  type GetDotenvOptions,
  type Logger,
  resolveGetDotenvOptions,
} from '../GetDotenvOptions';
import { getDotenvOptionsSchemaResolved } from '../schema/getDotenvOptions';
import { defaultsDeep } from '../util/defaultsDeep';
import { interpolateDeep } from '../util/interpolateDeep';
import { loadModuleDefault } from '../util/loadModuleDefault';
import type { GetDotenvCliPlugin } from './definePlugin';
import type { GetDotenvCliCtx } from './GetDotenvCli';

/**
 * Instance-bound plugin config store.
 * Host stores the validated/interpolated slice per plugin instance.
 * The store is intentionally private to this module; definePlugin()
 * provides a typed accessor that reads from this store for the calling
 * plugin instance.
 */
const PLUGIN_CONFIG_STORE: WeakMap<
  GetDotenvCliPlugin<unknown>,
  unknown
> = new WeakMap();
export const _setPluginConfigForInstance = (
  plugin: GetDotenvCliPlugin<unknown>,
  cfg: unknown,
) => {
  PLUGIN_CONFIG_STORE.set(plugin, cfg);
};
export const _getPluginConfigForInstance = (
  plugin: GetDotenvCliPlugin<unknown>,
): unknown => PLUGIN_CONFIG_STORE.get(plugin);

/**
 * Compute the dotenv context for the host (uses the config loader/overlay path).
 * - Resolves and validates options strictly (host-only).
 * - Applies file cascade, overlays, dynamics, and optional effects.
 * - Merges and validates per-plugin config slices (when provided).
 *
 * @param customOptions - Partial options from the current invocation.
 * @param plugins - Installed plugins (for config validation).
 * @param hostMetaUrl - import.meta.url of the host module (for packaged root discovery).
 */
export const computeContext = async <
  TOptions extends GetDotenvOptions = GetDotenvOptions,
>(
  customOptions: Partial<TOptions>,
  plugins: GetDotenvCliPlugin<TOptions>[],
  hostMetaUrl: string,
): Promise<GetDotenvCliCtx<TOptions>> => {
  const optionsResolved = await resolveGetDotenvOptions(customOptions);
  const validated = getDotenvOptionsSchemaResolved.parse(optionsResolved);
  // Always-on loader path
  // 1) Base from files only (no dynamic, no programmatic vars)
  // Sanitize to avoid passing properties explicitly set to undefined
  // (exactOptionalPropertyTypes).
  const cleanedValidated = Object.fromEntries(
    Object.entries(validated).filter(([, v]) => v !== undefined),
  ) as Partial<GetDotenvOptions>;

  const base = await getDotenv({
    ...cleanedValidated,
    // Build a pure base without side effects or logging.
    excludeDynamic: true,
    vars: {},
    log: false,
    loadProcess: false,
    // Intentionally omit outputPath for the base pass; including a key with
    // undefined would violate exactOptionalPropertyTypes on the Partial target.
  });
  // 2) Discover config sources and overlay
  const sources = await resolveGetDotenvConfigSources(hostMetaUrl);
  const dotenvOverlaid = overlayEnv({
    base,
    env: validated.env ?? validated.defaultEnv,
    configs: sources,
    ...(validated.vars ? { programmaticVars: validated.vars } : {}),
  });
  // Helper to apply a dynamic map progressively.
  const applyDynamic = (
    target: Record<string, string | undefined>,
    dynamic: GetDotenvDynamic | undefined,
    env: string | undefined,
  ) => {
    if (!dynamic) return;
    for (const key of Object.keys(dynamic)) {
      const value =
        typeof dynamic[key] === 'function'
          ? (
              dynamic[key] as (
                v: Record<string, string | undefined>,
                e?: string,
              ) => string | undefined
            )(target, env)
          : dynamic[key];
      Object.assign(target, { [key]: value });
    }
  };

  // 3) Apply dynamics in order
  const dotenv = { ...dotenvOverlaid };
  applyDynamic(
    dotenv,
    (validated as unknown as { dynamic?: GetDotenvDynamic }).dynamic,
    validated.env ?? validated.defaultEnv,
  );
  applyDynamic(
    dotenv,
    (sources.packaged?.dynamic ?? undefined) as GetDotenvDynamic | undefined,
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
      throw new Error(`Unable to load dynamic from ${validated.dynamicPath}`);
    }
  }

  // 4) Output/log/process merge
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
  const logger: Logger =
    (customOptions as { logger?: Logger }).logger ?? console;
  if (validated.log) logger.log(dotenv);
  if (validated.loadProcess) Object.assign(process.env, dotenv);

  // 5) Merge and validate per-plugin config (packaged < project.public < project.local)
  const packagedPlugins =
    (sources.packaged &&
      (
        sources.packaged as unknown as {
          plugins?: Record<string, unknown>;
        }
      ).plugins) ??
    {};
  const publicPlugins =
    (sources.project?.public &&
      (
        sources.project.public as unknown as {
          plugins?: Record<string, unknown>;
        }
      ).plugins) ??
    {};
  const localPlugins =
    (sources.project?.local &&
      (
        sources.project.local as unknown as {
          plugins?: Record<string, unknown>;
        }
      ).plugins) ??
    {};
  // The by-id map is retained only for backwards-compat rendering paths
  // (root help dynamic evaluation). Instance-bound access is the source
  // of truth going forward and is populated below.
  const mergedPluginConfigsById = defaultsDeep<Record<string, unknown>>(
    {},
    packagedPlugins,
    publicPlugins,
    localPlugins,
  );
  for (const p of plugins) {
    if (!p.id) continue;
    const slice = mergedPluginConfigsById[p.id];
    if (slice === undefined) continue;
    // Per-plugin interpolation just before validation/afterResolve:
    // precedence: process.env wins over ctx.dotenv for slice defaults.
    const envRef: Record<string, string | undefined> = {
      ...dotenv,
      ...process.env,
    };
    const interpolated = interpolateDeep(
      slice as Record<string, unknown>,
      envRef,
    );
    // Validate if a schema is provided; otherwise accept interpolated slice as-is.
    if (p.configSchema) {
      const parsed = p.configSchema.safeParse(interpolated);
      if (!parsed.success) {
        const msgs = parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('\n');
        throw new Error(`Invalid config for plugin '${p.id}':\n${msgs}`);
      }
      _setPluginConfigForInstance(
        p as GetDotenvCliPlugin<unknown>,
        parsed.data,
      );
      mergedPluginConfigsById[p.id] = parsed.data;
    } else {
      _setPluginConfigForInstance(
        p as GetDotenvCliPlugin<unknown>,
        interpolated,
      );
      mergedPluginConfigsById[p.id] = interpolated;
    }
  }

  return {
    optionsResolved: validated as unknown as TOptions,
    dotenv: dotenv as ProcessEnv,
    plugins: {},
    // Retained for legacy root help dynamic evaluation only. Instance-bound
    // access is used by plugins themselves and tests/docs moving forward.
    pluginConfigs: mergedPluginConfigsById,
  };
};
