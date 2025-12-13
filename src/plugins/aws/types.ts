import { z } from 'zod';

import type { ProcessEnv } from '@/src/core';

/**
 * Zod schema for AWS plugin configuration.
 */
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

/**
 * AWS plugin configuration object.
 */
export type AwsPluginConfig = z.infer<typeof AwsPluginConfigSchema>;

/**
 * AWS credentials object (Access Key ID, Secret Access Key, Session Token).
 */
export type AwsCredentials = {
  /** AWS Access Key ID. */
  accessKeyId: string;
  /** AWS Secret Access Key. */
  secretAccessKey: string;
  /** AWS Session Token (optional). */
  sessionToken?: string;
};

/**
 * Resolved AWS context.
 */
export type AwsContext = {
  /** Resolved AWS profile name. */
  profile?: string;
  /** Resolved AWS region. */
  region?: string;
  /** Resolved AWS credentials. */
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
  /** Plugin configuration. */
  cfg: AwsPluginConfig;
}
