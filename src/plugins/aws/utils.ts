import { isObject } from 'radash';

/**
 * Retrieve the resolved AWS region from the host context.
 * Reads `ctx.plugins.aws.region` safely.
 *
 * @param ctx - The host context (or any object with a `plugins` property).
 * @returns The region string if present, otherwise undefined.
 */
export const getAwsRegion = (ctx: {
  plugins?: unknown;
}): string | undefined => {
  if (!isObject(ctx.plugins)) return;
  const aws = (ctx.plugins as Record<string, unknown>)['aws'];
  if (!isObject(aws)) return;
  const region = (aws as Record<string, unknown>)['region'];
  return typeof region === 'string' ? region : undefined;
};
