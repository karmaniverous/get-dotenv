/* eslint-disable */
import type { OptionValues } from '@commander-js/extra-typings';
import path from 'path';

import { resolveGetDotenvConfigSources } from '@/src/config';
import type { GetDotenvDynamic, GetDotenvOptions, Logger } from '@/src/core';
import { resolveGetDotenvOptions } from '@/src/core';
import {
  applyDynamicMapWithProvenance,
  loadDynamicModuleDefault,
  overlayEnvWithProvenance,
  readDotenvCascadeWithProvenance,
} from '@/src/env';
import { getDotenvOptionsSchemaResolved } from '@/src/schema';
import { defaultsDeep, interpolateDeep, writeDotenvFile } from '@/src/util';

import type { GetDotenvCliPlugin } from './contracts';
import type { GetDotenvCliCtx } from './types';
import { flattenPluginTreeByPath, type PluginFlattenedEntry } from './paths';

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
export const setPluginConfig = <
  TOptions extends GetDotenvOptions,
  TCfg,
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
>(
  plugin: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>,
  cfg: Readonly<TCfg>,
): void => {
  PLUGIN_CONFIG_STORE.set(
    plugin as unknown as GetDotenvCliPlugin<
      any,
      unknown[],
      OptionValues,
      OptionValues
    >,
    cfg,
  );
};

/**
 * Retrieve the validated/interpolated config slice for a plugin instance.
 */
export const getPluginConfig = <
  TOptions extends GetDotenvOptions,
  TCfg,
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
>(
  plugin: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>,
): Readonly<TCfg> | undefined => {
  return PLUGIN_CONFIG_STORE.get(
    plugin as unknown as GetDotenvCliPlugin<
      any,
      unknown[],
      OptionValues,
      OptionValues
    >,
  ) as Readonly<TCfg> | undefined;
};

/**
 * Compute the dotenv context for the host (uses the config loader/overlay path).
 * - Resolves and validates options strictly (host-only).
 * - Applies file cascade, overlays, dynamics, and optional effects.
 * - Merges and validates per-plugin config slices (when provided), keyed by
 *   realized mount path (ns chain).
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

  // Discover config sources.
  const sources = await resolveGetDotenvConfigSources(hostMetaUrl);

  // Base dotenv from files (with file provenance; no dynamics; no programmatic vars; no side effects).
  const envName = validated.env ?? validated.defaultEnv;
  const fileRes = await readDotenvCascadeWithProvenance({
    dotenvToken: validated.dotenvToken,
    privateToken: validated.privateToken,
    paths: Array.isArray(validated.paths) ? validated.paths : [],
    env: validated.env,
    defaultEnv: validated.defaultEnv,
    excludeEnv: validated.excludeEnv,
    excludeGlobal: validated.excludeGlobal,
    excludePrivate: validated.excludePrivate,
    excludePublic: validated.excludePublic,
  });

  // Overlay configs + vars with provenance.
  const overlaid = overlayEnvWithProvenance({
    base: fileRes.dotenv,
    env: envName,
    configs: sources,
    programmaticVars: validated.vars,
    provenance: fileRes.provenance,
  });

  const dotenv: Record<string, string | undefined> = { ...overlaid.env };
  const dotenvProvenance = overlaid.provenance;

  // Dynamic precedence (A2): config dynamic < programmatic dynamic < dynamicPath
  if (!validated.excludeDynamic) {
    // Config dynamics (JS/TS configs only), ordered by source precedence.
    const packagedDyn = (sources.packaged?.dynamic ?? undefined) as
      | GetDotenvDynamic
      | undefined;
    const publicDyn = (sources.project?.public?.dynamic ?? undefined) as
      | GetDotenvDynamic
      | undefined;
    const localDyn = (sources.project?.local?.dynamic ?? undefined) as
      | GetDotenvDynamic
      | undefined;

    applyDynamicMapWithProvenance(
      dotenv,
      packagedDyn,
      envName,
      dotenvProvenance,
      {
        dynamicSource: 'config',
      },
    );
    applyDynamicMapWithProvenance(
      dotenv,
      publicDyn,
      envName,
      dotenvProvenance,
      {
        dynamicSource: 'config',
      },
    );
    applyDynamicMapWithProvenance(dotenv, localDyn, envName, dotenvProvenance, {
      dynamicSource: 'config',
    });

    // Programmatic dynamic (overrides config dynamic)
    applyDynamicMapWithProvenance(
      dotenv,
      validated.dynamic as GetDotenvDynamic | undefined,
      envName,
      dotenvProvenance,
      { dynamicSource: 'programmatic' },
    );

    // dynamicPath (highest dynamic tier; always evaluated when present)
    if (validated.dynamicPath) {
      const absDynamicPath = path.resolve(validated.dynamicPath);
      const dyn = await loadDynamicModuleDefault(
        absDynamicPath,
        'getdotenv-dynamic-host',
      );
      applyDynamicMapWithProvenance(dotenv, dyn, envName, dotenvProvenance, {
        dynamicSource: 'dynamicPath',
        dynamicPath: validated.dynamicPath,
      });
    }
  }

  // Effects:
  if (validated.outputPath) {
    await writeDotenvFile(validated.outputPath, dotenv);
  }
  const logger: Logger = (validated as GetDotenvOptions).logger!;
  if (validated.log) logger.log(dotenv);
  if (validated.loadProcess) Object.assign(process.env, dotenv);

  // Merge and validate per-plugin config keyed by realized path (ns chain).
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

  const entries: PluginFlattenedEntry<TOptions, TArgs, TOpts, TGlobal>[] =
    flattenPluginTreeByPath(plugins);

  const mergedPluginConfigsByPath: Record<string, unknown> = {};
  const envRef: Record<string, string | undefined> = {
    ...dotenv,
    ...process.env,
  };
  for (const e of entries) {
    const pathKey = e.path;
    const mergedRaw = defaultsDeep<Record<string, unknown>>(
      {},
      (packagedPlugins[pathKey] as Record<string, unknown> | undefined) ?? {},
      (publicPlugins[pathKey] as Record<string, unknown> | undefined) ?? {},
      (localPlugins[pathKey] as Record<string, unknown> | undefined) ?? {},
    );
    const interpolated =
      mergedRaw && typeof mergedRaw === 'object'
        ? interpolateDeep(mergedRaw, envRef)
        : ({} as Record<string, unknown>);

    const schema = e.plugin.configSchema;
    if (schema) {
      const parsed = schema.safeParse(interpolated);
      if (!parsed.success) {
        const err = parsed.error;
        const msgs = err.issues
          .map((i) => {
            const pth = Array.isArray(i.path) ? i.path.join('.') : '';
            const msg =
              typeof i.message === 'string' ? i.message : 'Invalid value';
            return pth ? `${pth}: ${msg}` : msg;
          })
          .join('\n');
        throw new Error(`Invalid config for plugin at '${pathKey}':\n${msgs}`);
      }
      const frozen = Object.freeze(parsed.data);
      setPluginConfig(e.plugin, frozen);
      mergedPluginConfigsByPath[pathKey] = frozen;
    } else {
      const frozen = Object.freeze(interpolated);
      setPluginConfig(e.plugin, frozen);
      mergedPluginConfigsByPath[pathKey] = frozen;
    }
  }

  return {
    optionsResolved: validated as TOptions,
    dotenv,
    dotenvProvenance,
    plugins: {},
    pluginConfigs: mergedPluginConfigsByPath,
  };
};
