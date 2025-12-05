import type { z } from 'zod';

import type { Logger } from '../GetDotenvOptions';
import type { getDotenvCliOptionsSchemaResolved } from '../schema/getDotenvCliOptions';
import { baseRootOptionDefaults } from './defaults';
import type { ScriptsTable } from './types';

// Unify Scripts via the generic ScriptsTable<TShell> so shell types propagate.
export type Scripts = ScriptsTable;

/**
 * Options passed programmatically to `getDotenvCli`.
 * Derived from Zod schema for strict runtime alignment.
 */
export type GetDotenvCliOptions = z.output<
  typeof getDotenvCliOptionsSchemaResolved
> & {
  logger?: Logger;
};

export const baseGetDotenvCliOptions: Partial<GetDotenvCliOptions> =
  baseRootOptionDefaults as unknown as Partial<GetDotenvCliOptions>;
