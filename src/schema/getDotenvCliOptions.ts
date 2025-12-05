import { z } from 'zod';

import { getDotenvOptionsSchemaRaw } from './getDotenvOptions';
/**
 * Zod schemas for CLI-facing GetDotenv options (raw/resolved stubs).
 *
 * RAW allows stringly inputs (paths/vars + splitters). RESOLVED will later
 * reflect normalized types (paths: string[], vars: ProcessEnv), applied in the
 * CLI resolution pipeline.
 */

export const getDotenvCliOptionsSchemaRaw = getDotenvOptionsSchemaRaw.extend({
  // CLI-specific fields (stringly inputs before preprocessing)
  debug: z.boolean().optional(),
  strict: z.boolean().optional(),
  capture: z.boolean().optional(),
  trace: z.union([z.boolean(), z.array(z.string())]).optional(),
  redact: z.boolean().optional(),
  warnEntropy: z.boolean().optional(),
  entropyThreshold: z.number().optional(),
  entropyMinLength: z.number().optional(),
  entropyWhitelist: z.array(z.string()).optional(),
  redactPatterns: z.array(z.string()).optional(),
  paths: z.string().optional(),
  pathsDelimiter: z.string().optional(),
  pathsDelimiterPattern: z.string().optional(),
  scripts: z.record(z.string(), z.unknown()).optional(),
  shell: z.union([z.boolean(), z.string()]).optional(),
  vars: z.string().optional(),
  varsAssignor: z.string().optional(),
  varsAssignorPattern: z.string().optional(),
  varsDelimiter: z.string().optional(),
  varsDelimiterPattern: z.string().optional(),
});
export const getDotenvCliOptionsSchemaResolved = getDotenvCliOptionsSchemaRaw;

export type GetDotenvCliOptionsRaw = z.infer<
  typeof getDotenvCliOptionsSchemaRaw
>;
export type GetDotenvCliOptionsResolved = z.infer<
  typeof getDotenvCliOptionsSchemaResolved
>;
