/**
 * Overlay config-provided values onto a base env while recording provenance.
 *
 * Requirements addressed:
 * - Provenance entries for `kind: 'config'` include scope/privacy/env/configScope/configPrivacy.
 * - Provenance entries for `kind: 'vars'` represent explicit vars overlays.
 * - Provenance is recorded as layers are applied (no post-hoc reconstruction).
 * - Record `op: 'unset'` when a layer writes an undefined result (e.g., expansion yields empty).
 */

import type { ProcessEnv } from '@/src/core';
import { dotenvExpandAll } from '@/src/dotenv';
import type { GetDotenvConfigResolved } from '@/src/schema';

import type { OverlayConfigSources } from './overlayEnv';
import {
  createDotenvProvenance,
  type DotenvConfigProvenanceEntry,
  type DotenvProvenance,
  type DotenvVarsProvenanceEntry,
  pushDotenvProvenance,
} from './provenance';

const applyKv = (
  current: ProcessEnv,
  kv: Record<string, string> | undefined,
): { env: ProcessEnv; expanded: Record<string, string | undefined> } => {
  if (!kv || Object.keys(kv).length === 0)
    return { env: current, expanded: {} };
  const expanded = dotenvExpandAll(kv, { ref: current, progressive: true });
  return { env: { ...current, ...expanded }, expanded };
};

const opFrom = (v: string | undefined): 'set' | 'unset' =>
  typeof v === 'string' ? 'set' : 'unset';

const applyConfigSlice = (
  current: ProcessEnv,
  cfg: GetDotenvConfigResolved | undefined,
  env: string | undefined,
  prov: DotenvProvenance,
  meta: Omit<DotenvConfigProvenanceEntry, 'kind' | 'op' | 'scope' | 'env'> & {
    privacy: 'public' | 'private';
  },
): ProcessEnv => {
  if (!cfg) return current;

  // kind axis: global then env (env overrides global)
  {
    const { env: next, expanded } = applyKv(current, cfg.vars);
    for (const key of Object.keys(expanded)) {
      pushDotenvProvenance(prov, key, {
        kind: 'config',
        op: opFrom(expanded[key]),
        scope: 'global',
        privacy: meta.privacy,
        configScope: meta.configScope,
        configPrivacy: meta.configPrivacy,
      });
    }
    current = next;
  }

  {
    const envKv = env && cfg.envVars ? cfg.envVars[env] : undefined;
    const { env: next, expanded } = applyKv(current, envKv);
    for (const key of Object.keys(expanded)) {
      pushDotenvProvenance(prov, key, {
        kind: 'config',
        op: opFrom(expanded[key]),
        scope: 'env',
        privacy: meta.privacy,
        env,
        configScope: meta.configScope,
        configPrivacy: meta.configPrivacy,
      });
    }
    current = next;
  }

  return current;
};

/**
 * Input options for {@link overlayEnvWithProvenance}.
 *
 * @public
 */
export interface OverlayEnvWithProvenanceArgs {
  /**
   * Base environment variables.
   */
  base: ProcessEnv | Readonly<Record<string, string | undefined>>;
  /**
   * Target environment name.
   */
  env: string | undefined;
  /**
   * Configuration sources to overlay.
   */
  configs: OverlayConfigSources;
  /**
   * Explicit vars overlays applied at the highest static precedence tier.
   */
  programmaticVars?: ProcessEnv | Readonly<Record<string, string | undefined>>;
  /**
   * Existing provenance map to append into. When omitted, a new map is created.
   */
  provenance?: DotenvProvenance;
}

/**
 * Output of {@link overlayEnvWithProvenance}.
 *
 * @public
 */
export interface OverlayEnvWithProvenanceResult {
  /**
   * The overlaid environment.
   */
  env: ProcessEnv;
  /**
   * Provenance history for keys affected by overlays.
   */
  provenance: DotenvProvenance;
}

/**
 * Overlay config-provided values onto a base ProcessEnv using precedence axes:
 * - kind: env \> global
 * - privacy: local \> public
 * - source: project \> packaged \> base
 *
 * Programmatic explicit vars override all config slices.
 *
 * @param args - Overlay inputs.
 * @returns The overlaid env and the updated provenance mapping.
 *
 * @public
 */
export function overlayEnvWithProvenance(
  args: OverlayEnvWithProvenanceArgs,
): OverlayEnvWithProvenanceResult {
  const { base, env, configs } = args;
  const prov = args.provenance ?? createDotenvProvenance();
  let current: ProcessEnv = { ...base };

  // Source: packaged (public only)
  current = applyConfigSlice(current, configs.packaged, env, prov, {
    privacy: 'public',
    configScope: 'packaged',
    configPrivacy: 'public',
  });

  // Source: project (public -> local)
  current = applyConfigSlice(current, configs.project?.public, env, prov, {
    privacy: 'public',
    configScope: 'project',
    configPrivacy: 'public',
  });
  current = applyConfigSlice(current, configs.project?.local, env, prov, {
    privacy: 'private',
    configScope: 'project',
    configPrivacy: 'local',
  });

  // Programmatic explicit vars (top of static tier)
  const pv = args.programmaticVars ?? {};
  const varsKv: Record<string, string> = {};
  const unsetKeys: string[] = [];

  for (const [k, v] of Object.entries(pv)) {
    if (typeof v === 'string') varsKv[k] = v;
    else if (v === undefined) unsetKeys.push(k);
  }

  if (Object.keys(varsKv).length > 0) {
    const { env: next, expanded } = applyKv(current, varsKv);
    for (const key of Object.keys(expanded)) {
      const op: DotenvVarsProvenanceEntry['op'] = opFrom(expanded[key]);
      pushDotenvProvenance(prov, key, { kind: 'vars', op });
    }
    current = next;
  }

  // Explicit unsets (rare in current CLI flow; supported for provenance completeness).
  for (const key of unsetKeys) {
    current[key] = undefined;
    pushDotenvProvenance(prov, key, { kind: 'vars', op: 'unset' });
  }

  return { env: current, provenance: prov };
}
