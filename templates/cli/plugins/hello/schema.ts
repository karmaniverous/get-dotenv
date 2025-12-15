import { z } from 'zod';

export const helloConfigSchema = z.object({
  loud: z.boolean().optional().default(false),
  color: z.string().optional(),
});
