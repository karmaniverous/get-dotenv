import fs from 'fs-extra';
import path from 'path';

import { overlayEnv } from '../env/overlay';
import { getDotenv } from '../getDotenv';
import {
  type GetDotenvDynamic,
  type GetDotenvOptions,
  type Logger,
  type ProcessEnv,
} from '../GetDotenvOptions';
import { loadModuleDefault } from '../util/loadModuleDefault';
import { resolveGetDotenvConfigSources } from './loader';

/**
 * Resolve dotenv values using the config-loader/overlay path, guarded by the
 * `useConfigLoader` flag in options. Default CLI behavior remains unchanged
 * unless explicitly enabled.
 *
 * Order:
 * 1) Compute base from files only (exclude dynamic; ignore programmatic vars).
 * 2) Discover packaged + project config sources and overlay onto base.
 * 3) Apply dynamics in order:
 *    programmatic dynamic \> config dynamic (packaged → project public → project local)
 *    \> file dynamicPath.
 * 4) Optionally write outputPath, log, and merge into process.env.
 */
export const resolveDotenvWithConfigLoader = async (
  validated: GetDotenvOptions,
): Promise<ProcessEnv> => {
  // 1) Base from files, no dynamic, no programmatic vars
  const base = await getDotenv({
    ...validated,
    // Build a pure base without side effects or logging.
    excludeDynamic: true,
    vars: {},
    log: false,
    loadProcess: false,
    outputPath: undefined,
  } as unknown as Partial<GetDotenvOptions>);

  // 2) Discover config sources (packaged via this module's import.meta.url)
  const sources = await resolveGetDotenvConfigSources(import.meta.url);
  const dotenv = overlayEnv({
    base,
    env: validated.env ?? validated.defaultEnv,
    configs: sources,
    ...(validated.vars ? { programmaticVars: validated.vars } : {}),
  });

  // Helper to apply a dynamic map progressively.
  const applyDynamic = (
    target: ProcessEnv,
    dynamic: GetDotenvDynamic | undefined,
    env: string | undefined,
  ) => {
    if (!dynamic) return;
    for (const key of Object.keys(dynamic)) {
      const value =
        typeof dynamic[key] === 'function'
          ? (dynamic[key] as (v: ProcessEnv, e?: string) => string | undefined)(
              target,
              env,
            )
          : dynamic[key];
      Object.assign(target, { [key]: value });
    }
  };

  // 3) Apply dynamics in order
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
    (validated as unknown as { logger?: Logger }).logger ?? console;
  if (validated.log) logger.log(dotenv);
  if (validated.loadProcess) Object.assign(process.env, dotenv);

  return dotenv;
};
