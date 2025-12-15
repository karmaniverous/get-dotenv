import type { GetDotenvCliCtx, GetDotenvCliPublic } from '@/src/cliHost';

import type { AwsPlugin } from '.';
import { applyAwsContext } from './common';
import { resolveAwsContext } from './service';

/**
 * Create the AWS plugin `afterResolve` hook.
 *
 * This runs once per invocation after the host resolves dotenv context.
 *
 * @param plugin - The AWS plugin instance.
 * @returns An `afterResolve` hook function suitable for assigning to `plugin.afterResolve`.
 *
 * @internal
 */
export function attachAwsAfterResolveHook(plugin: AwsPlugin) {
  return async (cli: GetDotenvCliPublic, ctx: GetDotenvCliCtx) => {
    const cfg = plugin.readConfig(cli);

    const out = await resolveAwsContext({
      dotenv: ctx.dotenv,
      cfg,
    });
    applyAwsContext(out, ctx, true);

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
