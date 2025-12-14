import type { GetDotenvCliCtx } from '@/src/cliHost';

import type { AwsContext } from './types';

/**
 * Apply resolved AWS context to `process.env` and `ctx.plugins`.
 * Centralizes logic shared between the plugin action and `afterResolve` hook.
 *
 * @param out - Resolved AWS context to apply.
 * @param ctx - Host context to publish non-sensitive metadata into.
 * @param setProcessEnv - Whether to write credentials/region to `process.env` (default true).
 * @returns Nothing.
 */
export function applyAwsContext(
  out: AwsContext,
  ctx: GetDotenvCliCtx,
  setProcessEnv = true,
): void {
  const { profile, region, credentials } = out;
  if (setProcessEnv) {
    // Ensure the AWS SDK can load profile-based credentials (including SSO)
    // from ~/.aws/config. This is required on many setups where the SDK does
    // not read the config file unless explicitly enabled.
    if (profile) {
      process.env.AWS_PROFILE = profile;
      if (!process.env.AWS_DEFAULT_PROFILE) {
        process.env.AWS_DEFAULT_PROFILE = profile;
      }
      if (!process.env.AWS_SDK_LOAD_CONFIG) {
        process.env.AWS_SDK_LOAD_CONFIG = '1';
      }
    }
    if (region) {
      process.env.AWS_REGION = region;
      if (!process.env.AWS_DEFAULT_REGION) {
        process.env.AWS_DEFAULT_REGION = region;
      }
    }
    if (credentials) {
      process.env.AWS_ACCESS_KEY_ID = credentials.accessKeyId;
      process.env.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey;
      if (credentials.sessionToken !== undefined) {
        process.env.AWS_SESSION_TOKEN = credentials.sessionToken;
      }
    }
  }
  // Always publish minimal, non-sensitive metadata
  ctx.plugins ??= {};
  ctx.plugins['aws'] = {
    ...(profile ? { profile } : {}),
    ...(region ? { region } : {}),
  };
}
