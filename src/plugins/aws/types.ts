import { z } from 'zod';

import type { ProcessEnv } from '@/src/core';

export const AwsPluginConfigSchema = z.object({
  profile: z.string().optional(),
  region: z.string().optional(),
  defaultRegion: z.string().optional(),
  profileKey: z.string().default('AWS_LOCAL_PROFILE').optional(),
  profileFallbackKey: z.string().default('AWS_PROFILE').optional(),
  regionKey: z.string().default('AWS_REGION').optional(),
  strategy: z.enum(['cli-export', 'none']).default('cli-export').optional(),
  loginOnDemand: z.boolean().default(false).optional(),
});

export type AwsPluginConfig = z.infer<typeof AwsPluginConfigSchema>;

export type AwsCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

export type AwsContext = {
  profile?: string;
  region?: string;
  credentials?: AwsCredentials;
};

/**
 * Arguments for resolving AWS context (profile/region/credentials).
 *
 * @public
 */
export interface ResolveAwsContextOptions {
  /**
   * The current composed dotenv variables.
   */
  dotenv: ProcessEnv;
  cfg: AwsPluginConfig;
}
