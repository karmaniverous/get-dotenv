import { builtinModules } from 'node:module';

import fs from 'fs-extra';

type PkgJson = {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

/**
 * Compute the Rollup "external" list from package.json dependencies plus Node builtins.
 *
 * Keeping these external avoids bundling runtime dependencies and preserves the public surface.
 */
export async function computeExternal(): Promise<string[]> {
  const pkgJson = JSON.parse(
    await fs.readFile('package.json', 'utf-8'),
  ) as PkgJson;

  const list = [
    ...Object.keys(pkgJson.dependencies ?? {}),
    ...Object.keys(pkgJson.peerDependencies ?? {}),
    'esbuild',
    'typescript',
    ...builtinModules,
    ...builtinModules.map((m) => `node:${m}`),
  ];

  // Stable de-dupe while preserving first-seen ordering.
  const seen = new Set<string>();
  return list.filter((x) => {
    if (seen.has(x)) return false;
    seen.add(x);
    return true;
  });
}
