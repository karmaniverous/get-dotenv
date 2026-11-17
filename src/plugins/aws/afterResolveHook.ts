import type { GetDotenvCliCtx, GetDotenvCliPublic } from '@/src/cliHost';

import type { AwsPlugin } from '.';
import { awsConfigWithFlags } from './configOverrides';
import { establishAwsSession } from './session';

/**
 * Create the AWS plugin afterResolve hook.
 *
 * This runs after the host resolves dotenv context, but only when the aws
 * plugin (or a child of it) is in the invoked command path. It establishes
 * the invocation's session with the `aws` flags applied (read from the `aws`
 * mount, which Commander has parsed by then), unless the `aws`
 * `preSubcommand` hook already established it: then it keeps that session
 * (#56).
 *
 * @param plugin - The AWS plugin instance.
 * @param awsOpts - Reads the option values of the `aws` mount.
 * @returns An afterResolve hook function suitable for assigning to plugin.afterResolve.
 *
 * @internal
 */
export function attachAwsAfterResolveHook(
  plugin: AwsPlugin,
  awsOpts: () => unknown,
) {
  return async (cli: GetDotenvCliPublic, ctx: GetDotenvCliCtx) => {
    const out = await establishAwsSession(
      ctx,
      awsConfigWithFlags(plugin, cli, awsOpts()),
    );

    // Optional: low-noise breadcrumb for diagnostics
    if (process.env.GETDOTENV_DEBUG) {
      try {
        const msg = JSON.stringify({
          profile: out.profile,
          region: out.region,
          hasCreds: Boolean(out.credentials),
        });
        process.stderr.write(`[aws] afterResolve ${msg}\n`);
      } catch {
        /* ignore */
      }
    }
  };
}
