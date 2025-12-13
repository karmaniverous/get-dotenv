import { z } from 'zod';

import type { Scripts } from '@/src/cliHost';
import type { RootOptionsShape } from '@/src/cliHost';

import { getDotenvCliOptionsSchemaRaw } from './getDotenvCliOptions';
const visibilityMap = z.record(z.string(), z.boolean());

/**
 * Zod schemas for configuration files discovered by the new loader.
 *
 * Notes:
 * - RAW: all fields optional; only allowed top-level keys are:
 *   - rootOptionDefaults, rootOptionVisibility
 *   - scripts, vars, envVars
 *   - dynamic (JS/TS only), schema (JS/TS only)
 *   - plugins, requiredKeys
 * - RESOLVED: mirrors RAW (no path normalization).
 * - For JSON/YAML configs, the loader rejects "dynamic" and "schema" (JS/TS only).
 */

// String-only env value map
const stringMap = z.record(z.string(), z.string());
const envStringMap = z.record(z.string(), stringMap);

export const getDotenvConfigSchemaRaw = z.object({
  rootOptionDefaults: getDotenvCliOptionsSchemaRaw.optional(),
  rootOptionVisibility: visibilityMap.optional(),
  scripts: z.record(z.string(), z.unknown()).optional(), // Scripts validation left wide; generator validates elsewhere
  requiredKeys: z.array(z.string()).optional(),
  schema: z.unknown().optional(), // JS/TS-only; loader rejects in JSON/YAML
  vars: stringMap.optional(), // public, global
  envVars: envStringMap.optional(), // public, per-env
  // Dynamic in config (JS/TS only). JSON/YAML loader will reject if set.
  dynamic: z.unknown().optional(),
  // Per-plugin config bag; validated by plugins/host when used.
  plugins: z.record(z.string(), z.unknown()).optional(),
});

export type GetDotenvConfigRaw = z.infer<typeof getDotenvConfigSchemaRaw>;

export const getDotenvConfigSchemaResolved = getDotenvConfigSchemaRaw.transform(
  (raw) => raw as GetDotenvConfigResolved,
);

export type GetDotenvConfigResolved = {
  /**
   * Help-time/runtime root defaults applied by the host (collapsed families; CLI‑like).
   */
  rootOptionDefaults?: Partial<RootOptionsShape>;
  /**
   * Help-time visibility for root flags; when a key is false the corresponding
   * option(s) are hidden in root help output.
   */
  rootOptionVisibility?: Partial<Record<keyof RootOptionsShape, boolean>>;
  /**
   * Merged scripts table for resolving commands and shell behavior.
   * Entries may be strings or objects with `cmd` and optional `shell`.
   */
  scripts?: Scripts;
  /**
   * Keys required to be present in the final composed environment.
   * Validation occurs after overlays and dynamics.
   */
  requiredKeys?: string[];
  /**
   * Optional validation schema (e.g., Zod). When present and it exposes
   * `safeParse(finalEnv)`, the host executes it once after overlays.
   */
  schema?: unknown;
  /**
   * Public global variables (string‑only).
   */
  vars?: Record<string, string>;
  /**
   * Public per‑environment variables (string‑only).
   */
  envVars?: Record<string, Record<string, string>>;
  /**
   * Dynamic variable definitions (JS/TS configs only).
   */
  dynamic?: unknown;
  /**
   * Per‑plugin configuration slices keyed by realized mount path
   * (for example, "aws/whoami").
   */
  plugins?: Record<string, unknown>;
};

/**
 * Helper to normalize a RAW config object into a RESOLVED shape,
 * with Zod validation and helpful errors.
 */
export const parseResolveConfig = (value: unknown) => {
  const parsed = getDotenvConfigSchemaRaw.safeParse(value);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid getdotenv config:\n${msg}`);
  }
  return getDotenvConfigSchemaResolved.parse(parsed.data);
};
