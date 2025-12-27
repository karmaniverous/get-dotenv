import type { z } from 'zod';

import type { GetDotenvDynamic, Logger } from '@/src/core';
import { baseRootOptionDefaults } from '@/src/defaults';
import type { getDotenvCliOptionsSchemaResolved } from '@/src/schema';

import type { ScriptsTable } from './types';

/**
 * Unify Scripts via the generic ScriptsTable<TShell> so shell types propagate.
 */
export type Scripts = ScriptsTable;

/**
 * Canonical CLI options type derived from the Zod schema output.
 * Includes CLI-only flags (debug/strict/capture/trace/redaction/entropy),
 * stringly paths/vars, and inherited programmatic fields (minus normalized
 * shapes that are handled by resolution).
 */
export type GetDotenvCliOptions = Omit<
  z.output<typeof getDotenvCliOptionsSchemaResolved>,
  'logger' | 'dynamic' | 'scripts'
> & {
  /**
   * Compile-only overlay for DX: logger narrowed from unknown.
   */
  logger: Logger;
  /**
   * Compile-only overlay for DX: dynamic map narrowed from unknown.
   */
  dynamic?: GetDotenvDynamic;
  /**
   * Compile-only overlay for DX: scripts narrowed from Record\<string, unknown\>.
   */
  scripts?: Scripts;
};

/**
 * Base CLI options derived from the shared root option defaults.
 * Used for type-safe initialization of CLI options bags.
 */
export const baseGetDotenvCliOptions: Partial<GetDotenvCliOptions> =
  baseRootOptionDefaults as unknown as Partial<GetDotenvCliOptions>;
