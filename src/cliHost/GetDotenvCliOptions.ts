import type { z } from 'zod';

import type { Logger } from '@/src/core';
import { baseRootOptionDefaults } from '@/src/defaults';
import type { getDotenvCliOptionsSchemaResolved } from '@/src/schema';

import type { ScriptsTable } from './types';

// Unify Scripts via the generic ScriptsTable<TShell> so shell types propagate.
export type Scripts = ScriptsTable;

/**
 * Canonical CLI options type derived from the Zod schema output.
 * Includes CLI-only flags (debug/strict/capture/trace/redaction/entropy),
 * stringly paths/vars, and inherited programmatic fields (minus normalized
 * shapes that are handled by resolution).
 */
export type GetDotenvCliOptions = z.output<
  typeof getDotenvCliOptionsSchemaResolved
> & {
  /**
   * Compile-only overlay for DX: logger narrowed from unknown.
   */
  logger: Logger;
  /**
   * Compile-only overlay for DX: scripts narrowed from Record\<string, unknown\>.
   */
  scripts?: Scripts;
};

export const baseGetDotenvCliOptions: Partial<GetDotenvCliOptions> =
  baseRootOptionDefaults as unknown as Partial<GetDotenvCliOptions>;
