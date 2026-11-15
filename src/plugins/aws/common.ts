import type { GetDotenvCliCtx } from '@/src/cliHost';
import type { ProcessEnv } from '@/src/core';

import type { AwsContext } from './types';

/** Profile variables: removed when the session has static credentials. */
const PROFILE_KEYS = [
  'AWS_PROFILE',
  'AWS_DEFAULT_PROFILE',
  'AWS_SDK_LOAD_CONFIG',
];

/** Static credentials: removed when the session uses a profile. */
const STATIC_CREDENTIAL_KEYS = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
];

/**
 * The environment entries an AWS session sets (a string) or removes
 * (`undefined`), given the environment it applies to.
 *
 * The two credential sources are mutually exclusive: the AWS SDK warns (and
 * may change precedence in future) when both `AWS_PROFILE` and
 * `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` are set.
 * - With credentials: set the static credentials (no token removes
 *   `AWS_SESSION_TOKEN`) and remove the profile variables.
 * - With only a profile: set `AWS_PROFILE`, `AWS_DEFAULT_PROFILE` and
 *   `AWS_SDK_LOAD_CONFIG=1`, and remove the static credentials.
 * - With a region: set `AWS_REGION`, and `AWS_DEFAULT_REGION` if `env` has
 *   none.
 *
 * @param out - Resolved AWS context.
 * @param env - The environment the session applies to (for
 *   `AWS_DEFAULT_REGION`).
 * @returns The entries to set (string) or remove (`undefined`).
 */
export function awsSessionEnv(out: AwsContext, env: ProcessEnv): ProcessEnv {
  const { profile, region, credentials } = out;
  const entries: ProcessEnv = {};
  const remove = (keys: string[]) => {
    for (const k of keys) entries[k] = undefined;
  };

  if (credentials) {
    // Mode A: exported/static credentials (clear profile vars)
    remove(PROFILE_KEYS);
    entries.AWS_ACCESS_KEY_ID = credentials.accessKeyId;
    entries.AWS_SECRET_ACCESS_KEY = credentials.secretAccessKey;
    entries.AWS_SESSION_TOKEN = credentials.sessionToken;
  } else if (profile) {
    // Mode B: profile-based (SSO) credentials (clear static creds)
    remove(STATIC_CREDENTIAL_KEYS);
    entries.AWS_PROFILE = profile;
    entries.AWS_DEFAULT_PROFILE = profile;
    entries.AWS_SDK_LOAD_CONFIG = '1';
  }

  if (region) {
    entries.AWS_REGION = region;
    entries.AWS_DEFAULT_REGION = env.AWS_DEFAULT_REGION ?? region;
  }
  return entries;
}

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
  const { profile, region } = out;
  if (setProcessEnv) {
    for (const [k, v] of Object.entries(awsSessionEnv(out, process.env))) {
      if (v === undefined) Reflect.deleteProperty(process.env, k);
      else process.env[k] = v;
    }
  }
  // Always publish minimal, non-sensitive metadata
  ctx.plugins ??= {};
  ctx.plugins['aws'] = {
    ...(profile ? { profile } : {}),
    ...(region ? { region } : {}),
  };
}
