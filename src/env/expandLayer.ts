import type { ProcessEnv } from '@/src/core';
import { dotenvExpandAll } from '@/src/dotenv';

/**
 * Result of {@link expandLayer}.
 *
 * @internal
 */
export interface ExpandLayerResult {
  /** The composed map with the layer applied. */
  env: ProcessEnv;
  /** The layer's own keys, expanded. */
  expanded: ProcessEnv;
}

/**
 * Expand one overlay layer (a config `vars`/`envVars` slice or explicit vars)
 * progressively and apply it over the values composed so far.
 *
 * The layer is expanded against `process.env` overlaid with the values
 * composed so far (composed values win), the same reference as the file
 * cascade.
 *
 * @param current - The values composed so far.
 * @param kv - The layer's raw values.
 * @returns The composed map with the layer applied, and the layer's expanded
 *   values.
 *
 * @internal
 */
export const expandLayer = (
  current: ProcessEnv,
  kv: Record<string, string> | undefined,
): ExpandLayerResult => {
  if (!kv || Object.keys(kv).length === 0)
    return { env: current, expanded: {} };
  const expanded = dotenvExpandAll(kv, {
    ref: { ...process.env, ...current },
    progressive: true,
  });
  return { env: { ...current, ...expanded }, expanded };
};
