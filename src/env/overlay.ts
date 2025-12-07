import { dotenvExpandAll } from '@/src/dotenvExpand';
import type { ProcessEnv } from '@/src/GetDotenvOptions';
import type { GetDotenvConfigResolved } from '@/src/schema/getDotenvConfig';

export type OverlayConfigSources = {
  packaged?: GetDotenvConfigResolved;
  project?: {
    public?: GetDotenvConfigResolved;
    local?: GetDotenvConfigResolved;
  };
};

const applyKv = (
  current: ProcessEnv,
  kv: Record<string, string> | undefined,
): ProcessEnv => {
  if (!kv || Object.keys(kv).length === 0) return current;
  const expanded = dotenvExpandAll(kv, { ref: current, progressive: true });
  return { ...current, ...expanded };
};

const applyConfigSlice = (
  current: ProcessEnv,
  cfg: GetDotenvConfigResolved | undefined,
  env: string | undefined,
): ProcessEnv => {
  if (!cfg) return current;
  // kind axis: global then env (env overrides global)
  const afterGlobal = applyKv(current, cfg.vars);
  const envKv = env && cfg.envVars ? cfg.envVars[env] : undefined;
  return applyKv(afterGlobal, envKv);
};

/**
 * Overlay config-provided values onto a base ProcessEnv using precedence axes:
 * - kind: env \> global
 * - privacy: local \> public
 * - source: project \> packaged \> base
 *
 * Programmatic explicit vars (if provided) override all config slices.
 * Progressive expansion is applied within each slice.
 */
export function overlayEnv<
  B extends ProcessEnv | Readonly<Record<string, string | undefined>>,
>(args: { base: B; env: string | undefined; configs: OverlayConfigSources }): B;
export function overlayEnv<
  B extends ProcessEnv | Readonly<Record<string, string | undefined>>,
  P extends ProcessEnv | Readonly<Record<string, string | undefined>>,
>(args: {
  base: B;
  env: string | undefined;
  configs: OverlayConfigSources;
  programmaticVars: P;
}): B & P;
export function overlayEnv({
  base,
  env,
  configs,
  programmaticVars,
}: {
  base: ProcessEnv | Readonly<Record<string, string | undefined>>;
  env: string | undefined;
  configs: OverlayConfigSources;
  programmaticVars?: ProcessEnv | Readonly<Record<string, string | undefined>>;
}): ProcessEnv {
  let current = { ...base };

  // Source: packaged (public -> local)
  current = applyConfigSlice(current, configs.packaged, env);
  // Packaged "local" is not expected by policy; if present, honor it.
  // We do not have a separate object for packaged.local in sources, keep as-is.

  // Source: project (public -> local)
  current = applyConfigSlice(current, configs.project?.public, env);
  current = applyConfigSlice(current, configs.project?.local, env);

  // Programmatic explicit vars (top of static tier)
  if (programmaticVars) {
    const toApply: Record<string, string> = Object.fromEntries(
      Object.entries(programmaticVars).filter(
        ([_k, v]) => typeof v === 'string',
      ) as Array<[string, string]>,
    );
    current = applyKv(current, toApply);
  }

  return current;
}
