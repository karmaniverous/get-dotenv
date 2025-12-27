import { z } from 'zod';
/**
 * Zod schemas for programmatic GetDotenv options.
 *
 * Canonical source of truth for options shape. Public types are derived
 * from these schemas (see consumers via z.output\<\>).
 */

/**
 * Minimal process env representation used by options and helpers.
 * Values may be `undefined` to indicate "unset".
 */
/**
 * Schema for an env-like record.
 *
 * Keys are environment variable names and values are either strings or `undefined`
 * (to represent “unset”).
 *
 * @public
 */
export const processEnvSchema = z.record(z.string(), z.string().optional());

// RAW: all fields optional — undefined means "inherit" from lower layers.
/**
 * Programmatic options schema (raw).
 *
 * This schema is the canonical runtime source of truth for the `getDotenv()` programmatic API.
 * All fields are optional; `undefined` generally means “inherit default/lower layer”.
 *
 * @public
 */
export const getDotenvOptionsSchemaRaw = z.object({
  /** Default environment name when `env` is not provided. */
  defaultEnv: z.string().optional(),
  /** Base dotenv filename token (default `.env`). */
  dotenvToken: z.string().optional(),
  /** Path to a dynamic variables module (JS/TS) to load and apply. */
  dynamicPath: z.string().optional(),
  // Dynamic map is intentionally wide for now; refine once sources are normalized.
  /** Programmatic dynamic variable map (advanced). */
  dynamic: z.record(z.string(), z.unknown()).optional(),
  /** Selected environment name for this invocation (for env-scoped files and overlays). */
  env: z.string().optional(),
  /** When true, skip applying dynamic variables. */
  excludeDynamic: z.boolean().optional(),
  /** When true, skip environment-scoped dotenv files. */
  excludeEnv: z.boolean().optional(),
  /** When true, skip global dotenv files. */
  excludeGlobal: z.boolean().optional(),
  /** When true, skip private dotenv files. */
  excludePrivate: z.boolean().optional(),
  /** When true, skip public dotenv files. */
  excludePublic: z.boolean().optional(),
  /** When true, merge the final composed environment into `process.env`. */
  loadProcess: z.boolean().optional(),
  /** When true, log the final environment map via `logger`. */
  log: z.boolean().optional(),
  /** Logger used when `log` is enabled (console-compatible). */
  logger: z.unknown().default(console),
  /** Optional output dotenv file path to write after composition. */
  outputPath: z.string().optional(),
  /** Dotenv search paths (ordered). */
  paths: z.array(z.string()).optional(),
  /** Private token suffix for private dotenv files (default `local`). */
  privateToken: z.string().optional(),
  /** Explicit variables to overlay onto the composed dotenv map. */
  vars: processEnvSchema.optional(),
});

/**
 * Resolved programmatic options schema (post-inheritance).
 * For now, this mirrors the RAW schema; future stages may materialize defaults
 * and narrow shapes as resolution is wired into the host.
 */
/**
 * Programmatic options schema (resolved).
 *
 * Today this mirrors {@link getDotenvOptionsSchemaRaw}, but is kept as a distinct export
 * so future resolution steps can narrow or materialize defaults without breaking the API.
 *
 * @public
 */
export const getDotenvOptionsSchemaResolved = getDotenvOptionsSchemaRaw;

/** Programmatic options shape accepted by getDotenv callers (pre-inheritance). */
export type GetDotenvOptionsRaw = z.infer<typeof getDotenvOptionsSchemaRaw>;
/**
 * Programmatic options shape after resolution (post-inheritance). This derives
 * from {@link getDotenvOptionsSchemaResolved}.
 */
export type GetDotenvOptionsResolved = z.infer<
  typeof getDotenvOptionsSchemaResolved
>;
