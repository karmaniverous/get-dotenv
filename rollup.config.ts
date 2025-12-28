import type { RollupOptions } from 'rollup';

import { buildDtsConfigs } from './build/rollup/dts';
import { buildEsmConfig } from './build/rollup/esm';

const config: RollupOptions[] = [
  // Runtime ESM outputs are emitted from a single graph so Rollup can share chunks.
  await buildEsmConfig(),
  // DTS bundles remain one-file-per-entry (as before).
  ...(await buildDtsConfigs()),
];

export default config;
