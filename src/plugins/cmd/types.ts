import { z } from 'zod';

/**
 * Configuration for the parent-level command alias.
 *
 * @public
 */
export interface CmdOptionAlias {
  flags: string;
  description?: string;
  expand?: boolean;
}

/**
 * Options provided to the cmd plugin factory.
 *
 * @public
 */
export interface CmdPluginOptions {
  /**
   * When true, register as the default subcommand at the root.
   */
  asDefault?: boolean;
  /**
   * Optional alias option attached to the parent command to invoke the cmd
   * behavior without specifying the subcommand explicitly.
   */
  optionAlias?: string | CmdOptionAlias;
}

/**
 * Zod schema for cmd plugin configuration.
 */
export const CmdConfigSchema = z
  .object({
    expand: z.boolean().optional(),
  })
  .strict();
/**
 * Cmd plugin configuration object.
 */
export type CmdConfig = z.infer<typeof CmdConfigSchema>;

/**
 * Options for the cmd runner helper.
 *
 * Used to label the execution origin for diagnostics and future behavior
 * adjustments without changing the call sites.
 *
 * @public
 */
export interface RunCmdWithContextOptions {
  /**
   * Execution origin: parent alias or explicit subcommand.
   */
  origin?: 'alias' | 'subcommand';
}
