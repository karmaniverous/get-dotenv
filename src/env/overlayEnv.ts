import type { ProcessEnv } from '@/src/core';
import type { GetDotenvConfigResolved } from '@/src/schema';

import { expandLayer } from './expandLayer';

/**
 * Configuration sources for environment overlay.
 * Organized by scope (packaged vs project) and privacy (public vs local).
 *
 * @public
 */
export type OverlayConfigSources = {
  /** Packaged configuration (public). */
  packaged?: GetDotenvConfigResolved;
  /** Project configuration (public and local). */
  project?: {
    /** Project public configuration. */
    public?: GetDotenvConfigResolved;
    /** Project local configuration. */
    local?: GetDotenvConfigResolved;
  };
};

const applyConfigSlice = (
  current: ProcessEnv,
  cfg: GetDotenvConfigResolved | undefined,
  env: string | undefined,
): ProcessEnv => {
  if (!cfg) return current;
  // kind axis: global then env (env overrides global)
  const afterGlobal = expandLayer(current, cfg.vars).env;
  const envKv = env && cfg.envVars ? cfg.envVars[env] : undefined;
  return expandLayer(afterGlobal, envKv).env;
};

/**
 * Base options for overlaying config-provided values onto a dotenv map.
 *
 * @typeParam B - base env shape
 * @public
 */
export interface OverlayEnvOptionsBase<
  B extends ProcessEnv | Readonly<ProcessEnv>,
> {
  /** Base environment variables. */
  base: B;
  /** Target environment name. */
  env: string | undefined;
  /** Configuration sources to overlay. */
  configs: OverlayConfigSources;
}

/**
 * Options including explicit programmatic variables which take top precedence.
 *
 * @typeParam B - base env shape
 * @typeParam P - programmatic vars shape
 * @public
 */
export interface OverlayEnvOptionsWithProgrammatic<
  B extends ProcessEnv | Readonly<ProcessEnv>,
  P extends ProcessEnv | Readonly<ProcessEnv>,
> extends OverlayEnvOptionsBase<B> {
  /**
   * Explicit programmatic variables applied at the highest precedence tier.
   */
  programmaticVars: P;
}

/**
 * Overlay config-provided values onto a base ProcessEnv using precedence axes:
 * - kind: env \> global
 * - privacy: local \> public
 * - source: project \> packaged \> base
 *
 * Programmatic explicit vars (if provided) override all config slices.
 * Progressive expansion is applied within each slice, against `process.env`
 * overlaid with the values composed so far (composed values win).
 */
export function overlayEnv<B extends ProcessEnv | Readonly<ProcessEnv>>(args: {
  base: B;
  env: string | undefined;
  configs: OverlayConfigSources;
}): B;
export function overlayEnv<
  B extends ProcessEnv | Readonly<ProcessEnv>,
  P extends ProcessEnv | Readonly<ProcessEnv>,
>(args: {
  base: B;
  env: string | undefined;
  configs: OverlayConfigSources;
  programmaticVars: P;
}): B & P;
export function overlayEnv(
  args:
    | OverlayEnvOptionsBase<ProcessEnv | Readonly<ProcessEnv>>
    | OverlayEnvOptionsWithProgrammatic<
        ProcessEnv | Readonly<ProcessEnv>,
        ProcessEnv | Readonly<ProcessEnv>
      >,
): ProcessEnv {
  const { base, env, configs } = args;
  let current = { ...base };

  // Source: packaged (public -> local)
  current = applyConfigSlice(current, configs.packaged, env);
  // Packaged "local" is not expected by policy; if present, honor it.
  // We do not have a separate object for packaged.local in sources, keep as-is.

  // Source: project (public -> local)
  current = applyConfigSlice(current, configs.project?.public, env);
  current = applyConfigSlice(current, configs.project?.local, env);

  // Programmatic explicit vars (top of static tier)
  if ('programmaticVars' in args) {
    const toApply: Record<string, string> = Object.fromEntries(
      Object.entries(args.programmaticVars).filter(
        ([_k, v]) => typeof v === 'string',
      ) as Array<[string, string]>,
    );
    current = expandLayer(current, toApply).env;
  }

  return current;
}
