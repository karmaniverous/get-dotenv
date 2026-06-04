import type { GetDotenvCliCtx, GetDotenvCliPublic } from '@/src/cliHost';

import type { AwsPlugin } from '.';
import { applyAwsContext } from './common';
import { resolveAwsContext } from './service';

/**
 * Create the AWS plugin `afterResolve` hook.
 *
 * This runs globally once per invocation after the host resolves dotenv context.
 * Because `afterResolve` fires for ALL commands (not just `aws` paths),
 * `loginOnDemand` is forced to `false` here to prevent interactive SSO login
 * from blocking unrelated commands. Interactive login is handled by the
 * command-scoped `preSubcommand` hook and default action instead.
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
      // Force loginOnDemand off — afterResolve is global; see #23.
      cfg: { ...cfg, loginOnDemand: false },
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
