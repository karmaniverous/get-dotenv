import { builtinModules } from 'node:module';

import fs from 'fs-extra';
import { unique } from 'radash';

type PkgJson = {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

/**
 * Compute the Rollup "external" list from package.json dependencies plus Node builtins.
 *
 * Keeping these external avoids bundling runtime dependencies and preserves the public surface.
 */
export async function computeExternal(): Promise<(string | RegExp)[]> {
  const pkgJson = JSON.parse(
    await fs.readFile('package.json', 'utf-8'),
  ) as PkgJson;

  const list: (string | RegExp)[] = [
    ...Object.keys(pkgJson.dependencies ?? {}),
    ...Object.keys(pkgJson.peerDependencies ?? {}),
    'esbuild',
    'typescript',
    ...builtinModules,
    ...builtinModules.map((m) => `node:${m}`),
  ];

  // Mark AWS SDK / Smithy packages as external so Rollup does not bundle them.
  // These are optional peer dependencies used only by the AWS plugin; consumers
  // who need them will install their own copies.
  list.push(/^@aws-sdk\//, /^@smithy\//);

  // Stable de-dupe for the string entries (RegExps are always unique).
  const strings = unique(
    list.filter((x): x is string => typeof x === 'string'),
  );
  const regexps = list.filter((x): x is RegExp => x instanceof RegExp);

  return [...strings, ...regexps];
}
