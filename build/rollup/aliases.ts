import { resolve } from 'node:path';

import type { Alias } from '@rollup/plugin-alias';

/**
 * Package root. Rollup runs from it (`npm run build`), so the working
 * directory is the root.
 */
const packageRoot = resolve();

/**
 * Shared Rollup alias mappings.
 *
 * Note: tsconfig.json defines "\@/*" -\> "./*" (e.g., "\@/src/..." -\>
 * "./src/..."). Rollup needs an explicit alias rule to mirror that behavior.
 * The replacement is absolute: tsconfig has no `baseUrl`, so a bare
 * "src/..." id would not resolve.
 */
export const commonAliases: Alias[] = [
  { find: /^@\//, replacement: `${packageRoot}/` }, // "@/foo/bar" -> "<root>/foo/bar"
];
