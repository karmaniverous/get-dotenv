import { z } from 'zod';

/**
 * Configuration for the parent-level command alias.
 *
 * @public
 */
export interface CmdOptionAlias {
  /** Option flags (e.g. "-c, --cmd \<command...\>"). */
  flags: string;
  /** Option description. */
  description?: string;
  /** Whether to expand the alias value before execution. */
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
export const cmdPluginConfigSchema = z
  .object({
    expand: z.boolean().optional(),
  })
  .strict();
/**
 * Cmd plugin configuration object.
 */
export type CmdPluginConfig = z.infer<typeof cmdPluginConfigSchema>;

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
