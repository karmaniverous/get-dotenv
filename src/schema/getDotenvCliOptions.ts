import { z } from 'zod';

import { getDotenvOptionsSchemaRaw } from './getDotenvOptions';

/**
 * Zod schemas for CLI-facing GetDotenv options (raw/resolved stubs).
 *
 * RAW allows stringly inputs (paths/vars + splitters). RESOLVED will later
 * reflect normalized types (paths: string[], vars: ProcessEnv), applied in the
 * CLI resolution pipeline.
 */

/**
 * CLI options schema (raw).
 *
 * Extends the programmatic options schema with CLI-only flags and stringly inputs
 * which are normalized later by the host resolution pipeline.
 *
 * @public
 */
export const getDotenvCliOptionsSchemaRaw = getDotenvOptionsSchemaRaw.extend({
  // CLI-specific fields (stringly inputs before preprocessing)
  /** Enable verbose debug output (host-specific). */
  debug: z.boolean().optional(),
  /** Fail on validation errors (schema/requiredKeys). */
  strict: z.boolean().optional(),
  /** Capture child process stdio (useful for CI/tests). */
  capture: z.boolean().optional(),
  /** Emit child env diagnostics (boolean or selected keys). */
  trace: z.union([z.boolean(), z.array(z.string())]).optional(),
  /** Enable presentation-time redaction in trace/log output. */
  redact: z.boolean().optional(),
  /** Enable entropy warnings in trace/log output. */
  warnEntropy: z.boolean().optional(),
  /** Entropy threshold (bits/char) for warnings. */
  entropyThreshold: z.number().optional(),
  /** Minimum value length to consider for entropy warnings. */
  entropyMinLength: z.number().optional(),
  /** Regex patterns (strings) to suppress entropy warnings by key. */
  entropyWhitelist: z.array(z.string()).optional(),
  /** Additional key-match patterns (strings) for redaction. */
  redactPatterns: z.array(z.string()).optional(),
  /** Dotenv search paths provided as a single delimited string. */
  paths: z.string().optional(),
  /** Delimiter string used to split `paths`. */
  pathsDelimiter: z.string().optional(),
  /** Regex pattern used to split `paths` (takes precedence over delimiter). */
  pathsDelimiterPattern: z.string().optional(),
  /** Scripts table in a permissive shape at parse time (validated elsewhere). */
  scripts: z.record(z.string(), z.unknown()).optional(),
  /** Shell selection (`false` for shell-off, string for explicit shell). */
  shell: z.union([z.boolean(), z.string()]).optional(),
  /** Extra variables expressed as a single delimited string of assignments. */
  vars: z.string().optional(),
  /** Assignment operator used when parsing `vars`. */
  varsAssignor: z.string().optional(),
  /** Regex pattern used as the assignment operator for `vars` parsing. */
  varsAssignorPattern: z.string().optional(),
  /** Delimiter string used to split `vars`. */
  varsDelimiter: z.string().optional(),
  /** Regex pattern used to split `vars` (takes precedence over delimiter). */
  varsDelimiterPattern: z.string().optional(),
});

/**
 * Resolved CLI options schema.
 * For the current step this mirrors the RAW schema; later stages may further
 * narrow types post-resolution in the host pipeline.
 */
/**
 * CLI options schema (resolved).
 *
 * Today this mirrors {@link getDotenvCliOptionsSchemaRaw}, but is kept as a distinct export
 * so future resolution steps can narrow or materialize defaults without breaking the API.
 *
 * @public
 */
export const getDotenvCliOptionsSchemaResolved = getDotenvCliOptionsSchemaRaw;

/** CLI options shape accepted at parse time (pre-normalization). */
export type GetDotenvCliOptionsRaw = z.infer<
  typeof getDotenvCliOptionsSchemaRaw
>;
/**
 * CLI options shape after host-side resolution/normalization (post-parse).
 * This derives from {@link getDotenvCliOptionsSchemaResolved}.
 */
export type GetDotenvCliOptionsResolved = z.infer<
  typeof getDotenvCliOptionsSchemaResolved
>;
