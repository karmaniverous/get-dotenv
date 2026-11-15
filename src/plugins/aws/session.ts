import type { GetDotenvCliCtx } from '@/src/cliHost';

import { applyAwsContext } from './common';
import { resolveAwsContext } from './service';
import type { AwsContext, AwsPluginConfig } from './types';

/** The session established for each invocation, keyed by its context. */
const sessions = new WeakMap<GetDotenvCliCtx, AwsContext>();

/**
 * Establish the AWS session of an invocation once: the first caller (the
 * `aws` `preSubcommand` hook for `aws <flags> <child>`, else the
 * `afterResolve` hook) resolves it with `cfg` (config plus the `aws` flags)
 * and applies it to `process.env` and `ctx.plugins.aws`; every later caller
 * of the same invocation gets that session back, so an aws child command
 * keeps the session its parent established (#56).
 *
 * An invocation is one composed context: each run composes a new one.
 *
 * @param ctx - The invocation's host context.
 * @param cfg - Plugin config with this invocation's `aws` flags applied.
 * @returns The session.
 *
 * @internal
 */
export async function establishAwsSession(
  ctx: GetDotenvCliCtx,
  cfg: AwsPluginConfig,
): Promise<AwsContext> {
  const known = sessions.get(ctx);
  if (known) return known;
  const out = await resolveAwsContext({ dotenv: ctx.dotenv, cfg });
  applyAwsContext(out, ctx, true);
  sessions.set(ctx, out);
  return out;
}
