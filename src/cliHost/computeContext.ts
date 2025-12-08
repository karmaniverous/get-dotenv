/* eslint-disable */
import fs from 'fs-extra';
import type { OptionValues } from '@commander-js/extra-typings';
import path from 'path';

import { resolveGetDotenvConfigSources } from '@/src/config/loader';
import { overlayEnv } from '@/src/env/overlay';
import { getDotenv } from '@/src/getDotenv';
import type { ProcessEnv } from '@/src/GetDotenvOptions';
import {
  type GetDotenvDynamic,
  type GetDotenvOptions,
  type Logger,
  resolveGetDotenvOptions,
} from '@/src/GetDotenvOptions';
import { getDotenvOptionsSchemaResolved } from '@/src/schema/getDotenvOptions';
import { defaultsDeep } from '@/src/util/defaultsDeep';
import { interpolateDeep } from '@/src/util/interpolateDeep';
import { loadModuleDefault } from '@/src/util/loadModuleDefault';
import { omitUndefined } from '@/src/util/omitUndefined';

import type { GetDotenvCliPlugin } from './definePlugin';
import type { GetDotenvCliCtx } from './GetDotEnvCli';

/**
 * Instance-bound plugin config store.
 * Host stores the validated/interpolated slice per plugin instance.
 * The store is intentionally private to this module; definePlugin()
 * provides a typed accessor that reads from this store for the calling
 * plugin instance.
 */
const PLUGIN_CONFIG_STORE: WeakMap<
  GetDotenvCliPlugin<any, unknown[], OptionValues, OptionValues>,
  unknown
> = new WeakMap();

/**
 * Store a validated, interpolated config slice for a specific plugin instance.
 * Generic on both the host options type and the plugin config type to avoid
 * defaulting to GetDotenvOptions under exactOptionalPropertyTypes.
 */
export const setPluginConfig = <TOptions extends GetDotenvOptions, TCfg>(
  plugin: GetDotenvCliPlugin<
    TOptions,
    unknown[],
    OptionValues,
    OptionValues
  >,
  cfg: Readonly<TCfg>,
): void => {
  PLUGIN_CONFIG_STORE.set(
    plugin as unknown as GetDotenvCliPlugin<any, unknown[], OptionValues, OptionValues>,
    cfg,
  );
};

/**
 * Retrieve the validated/interpolated config slice for a plugin instance.
 */
export const getPluginConfig = <TOptions extends GetDotenvOptions, TCfg>(
  plugin: GetDotenvCliPlugin<
    TOptions,
    unknown[],
    OptionValues,
    OptionValues
  >,
): Readonly<TCfg> | undefined => {
  return PLUGIN_CONFIG_STORE.get(
    plugin as unknown as GetDotenvCliPlugin<any, unknown[], OptionValues, OptionValues>,
  ) as Readonly<TCfg> | undefined;
};

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
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
>(
  customOptions: Partial<TOptions>,
  plugins: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>[],
  hostMetaUrl: string,
): Promise<GetDotenvCliCtx<TOptions>> => {
  const optionsResolved = await resolveGetDotenvOptions(customOptions);
  // Zod boundary: parse returns the schema-derived shape; we adopt our public
  // GetDotenvOptions overlay (logger/dynamic typing) for internal processing.
  const validated = getDotenvOptionsSchemaResolved.parse(
    optionsResolved,
  ) as GetDotenvOptions;
  // Always-on loader path
  // 1) Base from files only (no dynamic, no programmatic vars)
  // Sanitize to avoid passing properties explicitly set to undefined.
  const cleanedValidated: Partial<GetDotenvOptions> = omitUndefined(validated);

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
    (validated as { dynamic?: GetDotenvDynamic }).dynamic,
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
  const logger: Logger = (validated as GetDotenvOptions).logger!;
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
    // Build interpolation reference once per plugin:
    const envRef: Record<string, string | undefined> = {
      ...dotenv,
      ...process.env,
    };
    const interpolated =
      slice && typeof slice === 'object'
        ? interpolateDeep(slice as Record<string, unknown>, envRef)
        : ({} as Record<string, unknown>);

    // Validate against schema when present; otherwise store interpolated slice as-is.
    const schema = p.configSchema;
    if (schema) {
      const parsed = schema.safeParse(interpolated);
      if (!parsed.success) {
        const err = parsed.error;
        const msgs = err.issues
          .map((i) => {
            const path = Array.isArray(i.path) ? i.path.join('.') : '';
            const msg =
              typeof i.message === 'string' ? i.message : 'Invalid value';
            return path ? `${path}: ${msg}` : msg;
          })
          .join('\n');
        throw new Error(`Invalid config for plugin '${p.id}':\n${msgs}`);
      }
      // Store a readonly (shallow-frozen) value for runtime safety.
      const frozen = Object.freeze(parsed.data);
      setPluginConfig(p, frozen);
      mergedPluginConfigsById[p.id] = frozen;
    } else {
      // Defensive fallback (shouldn't occur: definePlugin injects a strict empty schema).
      const frozen = Object.freeze(interpolated);
      setPluginConfig(p, frozen);
      mergedPluginConfigsById[p.id] = frozen;
    }
  }

  return {
    optionsResolved: validated as TOptions,
    dotenv,
    plugins: {},
    // Retained for legacy root help dynamic evaluation only. Instance-bound
    // access is used by plugins themselves and tests/docs moving forward.
    pluginConfigs: mergedPluginConfigsById,
  };
};
