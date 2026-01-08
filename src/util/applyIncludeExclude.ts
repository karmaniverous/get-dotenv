import { omit, pick } from 'radash';

import type { ProcessEnv } from '@/src/core';

/**
 * Filter an environment object using include/exclude lists.
 *
 * - If `exclude` is provided, keys in the list are removed.
 * - If `include` is provided, only keys in the list are kept (applied after exclusion).
 *
 * @param env - Source environment object.
 * @param options - Filtering options (include/exclude lists).
 * @returns A new environment object with keys filtered.
 */
export const applyIncludeExclude = (
  env: ProcessEnv,
  {
    include,
    exclude,
  }: {
    include?: string[];
    exclude?: string[];
  },
): ProcessEnv => {
  let out: ProcessEnv = env;
  if (exclude?.length) out = omit(out, exclude);
  if (include?.length) out = pick(out, include);
  return out;
};
