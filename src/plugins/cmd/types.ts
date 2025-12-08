import { z } from 'zod';

export type CmdPluginOptions = {
  /**
   * When true, register as the default subcommand at the root.
   */
  asDefault?: boolean;
  /**
   * Optional alias option attached to the parent command to invoke the cmd
   * behavior without specifying the subcommand explicitly.
   */
  optionAlias?:
    | string
    | { flags: string; description?: string; expand?: boolean };
};

// Plugin config (Zod): currently a single optional flag to control alias expansion default.
export const CmdConfigSchema = z
  .object({
    expand: z.boolean().optional(),
  })
  .strict();
export type CmdConfig = z.infer<typeof CmdConfigSchema>;
