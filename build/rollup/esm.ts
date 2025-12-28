import type { RollupOptions } from 'rollup';

import { commonAliases } from './aliases';
import { computeExternal } from './external';
import { buildEsmInputs } from './inputs';
import { createCommonPlugins } from './plugins';

/**
 * Build the ESM Rollup config as a single multi-entry graph.
 *
 * This is the critical interop fix:
 * - Multiple subpath entrypoints (cli/cliHost/plugins/...) are emitted from one graph
 * - Rollup can emit shared chunks, so internal singletons (WeakMaps/classes) are unified
 *   across all entrypoints at runtime.
 */
export async function buildEsmConfig(): Promise<RollupOptions> {
  const outputPath = 'dist';
  const [external, input] = await Promise.all([
    computeExternal(),
    buildEsmInputs(),
  ]);

  return {
    input,
    external,
    plugins: createCommonPlugins({
      aliases: commonAliases,
    }),
    output: {
      dir: outputPath,
      format: 'esm',
      entryFileNames: '[name].mjs',
      chunkFileNames: 'chunks/[name]-[hash].mjs',
      inlineDynamicImports: false,
    },
  };
}
