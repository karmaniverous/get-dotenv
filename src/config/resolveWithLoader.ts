import fs from 'fs-extra';
import path from 'path';

import type { EntropyOptions } from '../diagnostics/entropy';
import { maybeWarnEntropy } from '../diagnostics/entropy';
import type { RedactOptions } from '../diagnostics/redact';
import { redactObject } from '../diagnostics/redact';
import { overlayEnv } from '../env/overlay';
import { getDotenv } from '../getDotenv';
import {
  type GetDotenvDynamic,
  type GetDotenvOptions,
  type Logger,
  type ProcessEnv,
} from '../GetDotenvOptions';
import { interpolateDeep } from '../util/interpolateDeep';
import { loadModuleDefault } from '../util/loadModuleDefault';
import { resolveGetDotenvConfigSources } from './loader';

/**
 * Resolve dotenv values using the config-loader/overlay path (always-on in
 * host/generator flows; no-op when no config files are present).
 *
 * Order:
 * 1) Compute base from files only (exclude dynamic; ignore programmatic vars).
 * 2) Discover packaged + project config sources and overlay onto base.
 * 3) Apply dynamics in order:
 *    programmatic dynamic \> config dynamic (packaged → project public → project local)
 *    \> file dynamicPath.
 * 4) Phase C interpolation of remaining string options (e.g., outputPath).
 * 5) Optionally write outputPath, log, and merge into process.env.
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

  // 4) Phase C: interpolate remaining string options (exclude bootstrap set).
  // For now, interpolate outputPath only; bootstrap keys are excluded by design.
  const envRef: ProcessEnv = { ...process.env, ...dotenv };
  const outputPathInterpolated =
    typeof validated.outputPath === 'string'
      ? interpolateDeep(validated.outputPath, envRef)
      : undefined;

  // 5) Output/log/process merge (use interpolated outputPath if present)
  if (outputPathInterpolated) {
    await fs.writeFile(
      outputPathInterpolated,
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
  if (validated.log) {
    const redactFlag =
      (validated as unknown as { redact?: boolean }).redact ?? false;
    const redactPatterns = (
      validated as unknown as { redactPatterns?: string[] }
    ).redactPatterns;
    const redOpts: RedactOptions = {};
    if (redactFlag) redOpts.redact = true;
    if (redactFlag && Array.isArray(redactPatterns))
      redOpts.redactPatterns = redactPatterns;
    const bag = redactFlag ? redactObject(dotenv, redOpts) : { ...dotenv };
    logger.log(bag);
    // Entropy warnings: once per key per run (presentation only)
    const warnEntropyVal =
      (validated as unknown as { warnEntropy?: boolean }).warnEntropy ?? true;
    const entropyThresholdVal = (
      validated as unknown as { entropyThreshold?: number }
    ).entropyThreshold;
    const entropyMinLengthVal = (
      validated as unknown as { entropyMinLength?: number }
    ).entropyMinLength;
    const entropyWhitelistVal = (
      validated as unknown as { entropyWhitelist?: string[] }
    ).entropyWhitelist;
    const entOpts: EntropyOptions = {};
    // include keys only when defined to satisfy exactOptionalPropertyTypes
    if (typeof warnEntropyVal === 'boolean')
      entOpts.warnEntropy = warnEntropyVal;
    if (typeof entropyThresholdVal === 'number')
      entOpts.entropyThreshold = entropyThresholdVal;
    if (typeof entropyMinLengthVal === 'number')
      entOpts.entropyMinLength = entropyMinLengthVal;
    if (Array.isArray(entropyWhitelistVal))
      entOpts.entropyWhitelist = entropyWhitelistVal;
    for (const [k, v] of Object.entries(dotenv)) {
      maybeWarnEntropy(
        k,
        v,
        v !== undefined ? 'dotenv' : 'unset',
        entOpts,
        (line) => {
          logger.log(line);
        },
      );
    }
  }
  if (validated.loadProcess) Object.assign(process.env, dotenv);

  return dotenv;
};
