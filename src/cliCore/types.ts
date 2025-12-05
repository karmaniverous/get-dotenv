import type { Command } from 'commander';
import type { z } from 'zod';

import type { getDotenvCliOptionsSchemaRaw } from '../schema/getDotenvCliOptions';

/**
 * Minimal root options shape shared by CLI and generator layers.
 * Derived from Zod schema to ensure alignment with valid flags.
 */
export type RootOptionsShape = z.infer<typeof getDotenvCliOptionsSchemaRaw>;

/**
 * Scripts table shape (configurable shell type).
 */
export type ScriptsTable<TShell extends string | boolean = string | boolean> =
  Record<string, string | { cmd: string; shell?: TShell | undefined }>;

/**
 * Identity helper to define a scripts table while preserving a concrete TShell
 * type parameter in downstream inference.
 */
export const defineScripts =
  <TShell extends string | boolean>() =>
  <T extends ScriptsTable<TShell>>(t: T) =>
    t;
/**
 * Commander command augmented with a typed opts() and an options bag
 * for nested subcommands to inherit.
 */
export type CommandWithOptions<TOptions> = Command & {
  opts(): Partial<TOptions>;
  getDotenvCliOptions?: TOptions;
};
