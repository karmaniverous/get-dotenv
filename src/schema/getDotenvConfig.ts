import { z } from 'zod';

import type { Scripts } from '../generateGetDotenvCli/GetDotenvCliOptions';

/**
 * Zod schemas for configuration files discovered by the new loader.
 *
 * Notes:
 * - RAW: all fields optional; shapes are stringly-friendly (paths may be string[] or string).
 * - RESOLVED: normalized shapes (paths always string[]).
 * - For this step (JSON/YAML only), any defined `dynamic` will be rejected by the loader.
 */

// String-only env value map
const stringMap = z.record(z.string());
const envStringMap = z.record(z.string(), stringMap);

// Allow string[] or single string for "paths" in RAW; normalize later.
const rawPathsSchema = z.union([z.array(z.string()), z.string()]).optional();

export const getDotenvConfigSchemaRaw = z.object({
  dotenvToken: z.string().optional(),
  privateToken: z.string().optional(),
  paths: rawPathsSchema,
  loadProcess: z.boolean().optional(),
  log: z.boolean().optional(),
  shell: z.union([z.string(), z.boolean()]).optional(),
  scripts: z.record(z.unknown()).optional(), // Scripts validation left wide; generator validates elsewhere
  vars: stringMap.optional(), // public, global
  envVars: envStringMap.optional(), // public, per-env
  // Dynamic in config (JS/TS only). JSON/YAML loader will reject if set.
  dynamic: z.unknown().optional(),
});

export type GetDotenvConfigRaw = z.infer<typeof getDotenvConfigSchemaRaw>;

// Normalize paths to string[]
const normalizePaths = (p?: string[] | string) =>
  p === undefined ? undefined : Array.isArray(p) ? p : [p];

export const getDotenvConfigSchemaResolved = getDotenvConfigSchemaRaw.transform(
  (raw) =>
    ({
      ...raw,
      paths: normalizePaths(raw.paths),
    }) as GetDotenvConfigResolved,
);

export type GetDotenvConfigResolved = {
  dotenvToken?: string;
  privateToken?: string;
  paths?: string[];
  loadProcess?: boolean;
  log?: boolean;
  shell?: string | boolean;
  scripts?: Scripts;
  vars?: Record<string, string>;
  envVars?: Record<string, Record<string, string>>;
  dynamic?: unknown;
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
