import { z } from 'zod';

/**
 * Zod schema for hello plugin configuration.
 */
export const helloPluginConfigSchema = z.object({
  loud: z.boolean().optional().default(false),
});

/**
 * Hello plugin configuration object.
 */
export type HelloPluginConfig = z.infer<typeof helloPluginConfigSchema>;
