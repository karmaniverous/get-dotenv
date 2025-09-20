import { z } from 'zod';

export const AwsPluginConfigSchema = z.object({
  profile: z.string().optional(),
  region: z.string().optional(),
  defaultRegion: z.string().optional(),
  profileKey: z.string().default('AWS_LOCAL_PROFILE').optional(),
  profileFallbackKey: z.string().default('AWS_PROFILE').optional(),
  regionKey: z.string().default('AWS_REGION').optional(),
  strategy: z.enum(['cli-export', 'none']).default('cli-export').optional(),
  loginOnDemand: z.boolean().default(false).optional(),
  setEnv: z.boolean().default(true).optional(),
  addCtx: z.boolean().default(true).optional(),
});

export type AwsPluginConfig = z.infer<typeof AwsPluginConfigSchema>;
export type AwsPluginConfigResolved = z.infer<typeof AwsPluginConfigSchema>;

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
