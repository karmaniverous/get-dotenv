import type { RollupOptions } from 'rollup';
import dtsPlugin from 'rollup-plugin-dts';

import { commonAliases } from './aliases';
import { computeExternal } from './external';
import { createCommonPlugins } from './plugins';

type DtsTarget = { input: string; out: string };

const dtsTargets: DtsTarget[] = [
  { input: 'src/index.ts', out: 'dist/index.d.ts' },
  { input: 'src/cliHost/index.ts', out: 'dist/cliHost.d.ts' },
  { input: 'src/cli/index.ts', out: 'dist/cli.d.ts' },
  { input: 'src/plugins/batch/index.ts', out: 'dist/plugins-batch.d.ts' },
  { input: 'src/plugins/aws/index.ts', out: 'dist/plugins-aws.d.ts' },
  { input: 'src/plugins/init/index.ts', out: 'dist/plugins-init.d.ts' },
  { input: 'src/plugins/cmd/index.ts', out: 'dist/plugins-cmd.d.ts' },
  { input: 'src/config/index.ts', out: 'dist/config.d.ts' },
  { input: 'src/env/index.ts', out: 'dist/env-overlay.d.ts' },
  { input: 'src/plugins/index.ts', out: 'dist/plugins.d.ts' },
];

/**
 * Build the Rollup configs for DTS bundles.
 *
 * Notes:
 * - We keep these as explicit single-file outputs (one per subpath), matching prior dist names.
 * - Shared chunks are not needed for type bundles; the runtime interop issue is solved by ESM build chunking.
 */
export async function buildDtsConfigs(): Promise<RollupOptions[]> {
  const outputPath = 'dist';
  const external = await computeExternal();

  return dtsTargets.map<RollupOptions>((t) => ({
    input: t.input,
    external,
    plugins: [
      ...createCommonPlugins({
        aliases: commonAliases,
        outputPath,
        includeCopy: true,
      }),
      dtsPlugin({ tsconfig: './tsconfig.base.json' }),
    ],
    output: [{ file: t.out, format: 'esm' }],
  }));
}
