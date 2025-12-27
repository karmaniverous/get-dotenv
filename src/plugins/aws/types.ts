import { z } from 'zod';

import type { ProcessEnv } from '@/src/core';

/**
 * AWS plugin configuration schema.
 *
 * @remarks
 * This Zod schema is used by the host to validate the `plugins.aws` config slice.
 *
 * @public
 * @hidden
 */
export const awsPluginConfigSchema = z.object({
  /** Preferred AWS profile name (overrides dotenv-derived profile keys when set). */
  profile: z.string().optional(),
  /** Preferred AWS region (overrides dotenv-derived region key when set). */
  region: z.string().optional(),
  /** Fallback region when region cannot be resolved from config/dotenv/AWS CLI. */
  defaultRegion: z.string().optional(),
  /** Dotenv/config key for local profile lookup (default `AWS_LOCAL_PROFILE`). */
  profileKey: z.string().default('AWS_LOCAL_PROFILE').optional(),
  /** Dotenv/config fallback key for profile lookup (default `AWS_PROFILE`). */
  profileFallbackKey: z.string().default('AWS_PROFILE').optional(),
  /** Dotenv/config key for region lookup (default `AWS_REGION`). */
  regionKey: z.string().default('AWS_REGION').optional(),
  /** Credential acquisition strategy (`cli-export` to resolve via AWS CLI, or `none` to skip). */
  strategy: z.enum(['cli-export', 'none']).default('cli-export').optional(),
  /** When true, attempt `aws sso login` on-demand when credential export fails for an SSO profile. */
  loginOnDemand: z.boolean().default(false).optional(),
});

/**
 * AWS plugin configuration object.
 */
export type AwsPluginConfig = z.infer<typeof awsPluginConfigSchema>;

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
