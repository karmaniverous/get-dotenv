import { builtinModules } from 'node:module';

import type { Alias } from '@rollup/plugin-alias';
import aliasPlugin from '@rollup/plugin-alias';
import commonjsPlugin from '@rollup/plugin-commonjs';
import jsonPlugin from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescriptPlugin from '@rollup/plugin-typescript';
import fs from 'fs-extra';
import type { InputOptions, RollupOptions } from 'rollup';
import dtsPlugin from 'rollup-plugin-dts';
// Read package.json dynamically to avoid JSON import assertions at runtime.

const outputPath = `dist`;
const commonPlugins = [
  commonjsPlugin(),
  jsonPlugin(),
  nodeResolve(),
  typescriptPlugin(),
];

const commonAliases: Alias[] = [];

const pkgJson = JSON.parse(await fs.readFile('package.json', 'utf-8')) as any;

const external = [
  ...Object.keys((pkgJson as any).dependencies ?? {}),
  ...Object.keys((pkgJson as any).peerDependencies ?? {}),
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
];
const commonInputOptions: InputOptions = {
  input: 'src/index.ts',
  // Avoid bundling runtime deps (execa/npm-run-path/unicorn-magic, etc.)
  external,
  plugins: [aliasPlugin({ entries: commonAliases }), ...commonPlugins],
};
const cliCommands = await fs.readdir('src/cli');
const config: RollupOptions[] = [
  // ESM output.
  {
    ...commonInputOptions,
    output: [
      {
        extend: true,
        file: `${outputPath}/index.mjs`,
        format: 'esm',
      },
    ],
  },

  // CommonJS output.
  {
    ...commonInputOptions,
    output: [
      {
        extend: true,
        file: `${outputPath}/index.cjs`,
        format: 'cjs',
      },
    ],
  },

  // Type definitions output.
  {
    ...commonInputOptions,
    plugins: [
      aliasPlugin({ entries: commonAliases }),
      ...commonPlugins,
      dtsPlugin(),
    ],
    output: [
      {
        extend: true,
        file: `${outputPath}/index.d.ts`,
        format: 'esm',
      },
      {
        extend: true,
        file: `${outputPath}/index.d.mts`,
        format: 'esm',
      },
      {
        extend: true,
        file: `${outputPath}/index.d.cts`,
        format: 'cjs',
      },
    ],
  },

  // CLI output.
  ...cliCommands.map<RollupOptions>((c) => ({
    ...commonInputOptions,
    input: `src/cli/${c}/index.ts`,
    output: [
      {
        extend: true,
        file: `${outputPath}/${c}.cli.mjs`,
        format: 'esm',
      },
    ],
  })),
];

export default config;
