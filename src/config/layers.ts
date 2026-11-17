import type { GetDotenvConfigResolved } from '@/src/schema';

import type { ResolvedConfigSources } from './loader';

/**
 * The config sources as layers, lowest precedence first: packaged, then
 * project public, then project local. A missing source is `undefined`.
 *
 * @param sources - The resolved config sources.
 * @returns The three layers, in precedence order.
 *
 * @internal
 */
export const configLayers = (
  sources: ResolvedConfigSources,
): Array<GetDotenvConfigResolved | undefined> => [
  sources.packaged,
  sources.project?.public,
  sources.project?.local,
];
