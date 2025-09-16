import { z } from 'zod';

import { getDotenvCliOptionsSchemaRaw } from './getDotenvCliOptions';
/**
 * Zod schemas for GetDotenv CLI generator options (raw/resolved stubs).
 *
 * RAW: All fields optional; used to compose the CLI host defaults.
 * RESOLVED: Will later reflect normalized shapes after inheritance/merging.
 */

export const getDotenvCliGenerateOptionsSchemaRaw =
  getDotenvCliOptionsSchemaRaw.extend({
    alias: z.string().optional(),
    description: z.string().optional(),
    importMetaUrl: z.string().optional(),
    // Hooks (JS/TS-only configs or programmatic). Keep wide in RAW.
    preHook: z.unknown().optional(),
    postHook: z.unknown().optional(),
    // logger remains flexible (defaults to console in legacy path)
    logger: z.unknown().optional(),
  });

export const getDotenvCliGenerateOptionsSchemaResolved =
  getDotenvCliGenerateOptionsSchemaRaw;

export type GetDotenvCliGenerateOptionsRaw = z.infer<
  typeof getDotenvCliGenerateOptionsSchemaRaw
>;
export type GetDotenvCliGenerateOptionsResolved = z.infer<
  typeof getDotenvCliGenerateOptionsSchemaResolved
>;
