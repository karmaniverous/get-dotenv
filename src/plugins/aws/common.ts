/** src/plugins/aws/common.ts
 * Apply resolved AWS context to process.env and ctx.plugins.
 * Centralizes duplicated logic between action and afterResolve.
 */
import type { GetDotenvCliCtx } from '@/src/cliHost/GetDotenvCli';

import type { AwsContext } from './types';

export function applyAwsContext(
  out: AwsContext,
  ctx: GetDotenvCliCtx,
  setProcessEnv = true,
): void {
  const { profile, region, credentials } = out;
  if (setProcessEnv) {
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
