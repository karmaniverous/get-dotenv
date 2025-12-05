import { z } from 'zod';
/**
 * Zod schemas for programmatic GetDotenv options.
 *
 * Canonical source of truth for options shape. Public types are derived
 * from these schemas (see consumers via z.output<>).
 */

// Minimal process env representation: string values or undefined to indicate "unset".
export const processEnvSchema = z.record(z.string(), z.string().optional());

// RAW: all fields optional — undefined means "inherit" from lower layers.
export const getDotenvOptionsSchemaRaw = z.object({
  defaultEnv: z.string().optional(),
  dotenvToken: z.string().optional(),
  dynamicPath: z.string().optional(),
  // Dynamic map is intentionally wide for now; refine once sources are normalized.
  dynamic: z.record(z.string(), z.unknown()).optional(),
  env: z.string().optional(),
  excludeDynamic: z.boolean().optional(),
  excludeEnv: z.boolean().optional(),
  excludeGlobal: z.boolean().optional(),
  excludePrivate: z.boolean().optional(),
  excludePublic: z.boolean().optional(),
  loadProcess: z.boolean().optional(),
  log: z.boolean().optional(),
  logger: z.unknown().optional(),
  outputPath: z.string().optional(),
  paths: z.array(z.string()).optional(),
  privateToken: z.string().optional(),
  vars: processEnvSchema.optional(),
});

// RESOLVED: service-boundary contract (post-inheritance).
// For Step A, keep identical to RAW (no behavior change). Later stages will// materialize required defaults and narrow shapes as resolution is wired.
export const getDotenvOptionsSchemaResolved = getDotenvOptionsSchemaRaw;

export type GetDotenvOptionsRaw = z.infer<typeof getDotenvOptionsSchemaRaw>;
export type GetDotenvOptionsResolved = z.infer<
  typeof getDotenvOptionsSchemaResolved
>;
