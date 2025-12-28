import type { Alias } from '@rollup/plugin-alias';

/**
 * Shared Rollup alias mappings.
 *
 * Note: tsconfig.json defines "\@/*" -\> "*" (e.g., "\@/src/..." -\> "src/...").
 * Rollup needs an explicit alias rule to mirror that behavior.
 */
export const commonAliases: Alias[] = [
  { find: /^@\//, replacement: '' }, // "@/foo/bar" -> "foo/bar"
];
