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

/**
 * Raw configuration schema for get‑dotenv config files (JSON/YAML/JS/TS).
 * Validates allowed top‑level keys without performing path normalization.
 */
/**
 * Config schema for discovered get-dotenv configuration documents (raw).
 *
 * This schema validates the allowed top-level keys for configuration files.
 * It does not normalize paths or coerce types beyond Zod’s parsing.
 *
 * @public
 */
export const getDotenvConfigSchemaRaw = z.object({
  /** Root option defaults applied by the host (CLI-like, collapsed families). */
  rootOptionDefaults: getDotenvCliOptionsSchemaRaw.optional(),
  /** Help-time visibility map for root flags (false hides). */
  rootOptionVisibility: visibilityMap.optional(),
  /** Scripts table used by cmd/batch resolution (validation intentionally permissive here). */
  scripts: z.record(z.string(), z.unknown()).optional(),
  /** Keys required to be present in the final composed environment. */
  requiredKeys: z.array(z.string()).optional(),
  /** Validation schema (JS/TS only; JSON/YAML loader rejects). */
  schema: z.unknown().optional(), // JS/TS-only; loader rejects in JSON/YAML
  /** Public global variables (string-only). */
  vars: stringMap.optional(), // public, global
  /** Public per-environment variables (string-only). */
  envVars: envStringMap.optional(), // public, per-env
  // Dynamic in config (JS/TS only). JSON/YAML loader will reject if set.
  /** Dynamic variable definitions (JS/TS only). */
  dynamic: z.unknown().optional(),
  // Per-plugin config bag; validated by plugins/host when used.
  /** Per-plugin config slices keyed by realized mount path (for example, `aws/whoami`). */
  plugins: z.record(z.string(), z.unknown()).optional(),
});

/** Raw configuration type inferred from {@link getDotenvConfigSchemaRaw}. */
export type GetDotenvConfigRaw = z.infer<typeof getDotenvConfigSchemaRaw>;

/**
 * Resolved configuration schema which preserves the raw shape while narrowing
 * the output to {@link GetDotenvConfigResolved}. Consumers get a strongly typed
 * object, while the underlying validation remains Zod‑driven.
 */
export const getDotenvConfigSchemaResolved = getDotenvConfigSchemaRaw.transform(
  (raw) => raw as GetDotenvConfigResolved,
);

/**
 * Resolved configuration object type returned by {@link getDotenvConfigSchemaResolved}.
 *
 * @public
 */
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
