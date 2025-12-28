import type { Dirent } from 'node:fs';

import fs from 'fs-extra';

/**
 * Build the ESM multi-entry input map for the dist build.
 *
 * Keys become output file basenames via entryFileNames: "[name].mjs".
 * For example:
 * - input key "cliHost" -\> dist/cliHost.mjs
 * - input key "getdotenv.cli" -\> dist/getdotenv.cli.mjs
 */
export async function buildEsmInputs(): Promise<Record<string, string>> {
  const input: Record<string, string> = {
    index: 'src/index.ts',
    cli: 'src/cli/index.ts',
    cliHost: 'src/cliHost/index.ts',
    plugins: 'src/plugins/index.ts',
    'plugins-aws': 'src/plugins/aws/index.ts',
    'plugins-batch': 'src/plugins/batch/index.ts',
    'plugins-init': 'src/plugins/init/index.ts',
    'plugins-cmd': 'src/plugins/cmd/index.ts',
    config: 'src/config/index.ts',
    'env-overlay': 'src/env/index.ts',
  };

  // Only treat subdirectories in src/cli as CLI binaries (e.g., "getdotenv").
  const cliEntries: Dirent[] = (await fs.readdir('src/cli', {
    withFileTypes: true,
  })) as unknown as Dirent[];

  const cliCommands = cliEntries
    .filter((e) =>
      typeof e.isDirectory === 'function' ? e.isDirectory() : false,
    )
    .map((e) => e.name);

  for (const name of cliCommands) {
    input[`${name}.cli`] = `src/cli/${name}/index.ts`;
  }

  return input;
}
