import { omit, pick } from 'radash';

import type { ProcessEnv } from '@/src/core';

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
