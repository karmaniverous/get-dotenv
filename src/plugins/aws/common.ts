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
    // Ensure AWS credential sources are mutually exclusive.
    // The AWS SDK warns (and may change precedence in future) when both
    // AWS_PROFILE and AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY are set.
    const clear = (keys: string[]) => {
      for (const k of keys) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete process.env[k];
      }
    };
    const clearProfileVars = () => {
      clear(['AWS_PROFILE', 'AWS_DEFAULT_PROFILE', 'AWS_SDK_LOAD_CONFIG']);
    };
    const clearStaticCreds = () => {
      clear([
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_SESSION_TOKEN',
      ]);
    };

    // Mode A: exported/static credentials (clear profile vars)
    if (credentials) {
      clearProfileVars();
      process.env.AWS_ACCESS_KEY_ID = credentials.accessKeyId;
      process.env.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey;
      if (credentials.sessionToken !== undefined) {
        process.env.AWS_SESSION_TOKEN = credentials.sessionToken;
      } else {
        delete process.env.AWS_SESSION_TOKEN;
      }
    } else if (profile) {
      // Mode B: profile-based (SSO) credentials (clear static creds)
      clearStaticCreds();
      process.env.AWS_PROFILE = profile;
      process.env.AWS_DEFAULT_PROFILE = profile;
      process.env.AWS_SDK_LOAD_CONFIG = '1';
    }

    if (region) {
      process.env.AWS_REGION = region;
      if (!process.env.AWS_DEFAULT_REGION) {
        process.env.AWS_DEFAULT_REGION = region;
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
