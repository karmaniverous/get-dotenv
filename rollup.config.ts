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
// Avoid JSON import assertions; read and type package.json

const outputPath = `dist`;
// Configure the TS plugin explicitly for Rollup builds:
// - Point to the base tsconfig to avoid project "outDir" constraints intended for tsc.
// - Unset outDir so @rollup/plugin-typescript doesn't error on path validation.
const tsPlugin = typescriptPlugin({
  tsconfig: './tsconfig.base.json',
  compilerOptions: { outDir: undefined },
});
const commonPlugins = [commonjsPlugin(), jsonPlugin(), nodeResolve(), tsPlugin];

const commonAliases: Alias[] = [];
type PkgJson = {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};
const pkgJson = JSON.parse(
  await fs.readFile('package.json', 'utf-8'),
) as PkgJson;
const external = [
  ...Object.keys(pkgJson.dependencies ?? {}),
  ...Object.keys(pkgJson.peerDependencies ?? {}),
  'esbuild',
  'typescript',
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
];
const commonInputOptions: InputOptions = {
  input: 'src/index.ts', // Avoid bundling runtime deps (execa/npm-run-path/unicorn-magic, etc.)
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

  // cliHost subpath (ESM/CJS)
  {
    ...commonInputOptions,
    input: 'src/cliHost/index.ts',
    output: [
      { extend: true, file: `${outputPath}/cliHost.mjs`, format: 'esm' },
    ],
  },
  {
    ...commonInputOptions,
    input: 'src/cliHost/index.ts',
    output: [
      { extend: true, file: `${outputPath}/cliHost.cjs`, format: 'cjs' },
    ],
  },
  // plugins/batch subpath
  {
    ...commonInputOptions,
    input: 'src/plugins/batch/index.ts',
    output: [
      { extend: true, file: `${outputPath}/plugins-batch.mjs`, format: 'esm' },
    ],
  },
  {
    ...commonInputOptions,
    input: 'src/plugins/batch/index.ts',
    output: [
      { extend: true, file: `${outputPath}/plugins-batch.cjs`, format: 'cjs' },
    ],
  },
  // plugins/init subpath
  {
    ...commonInputOptions,
    input: 'src/plugins/init/index.ts',
    output: [
      { extend: true, file: `${outputPath}/plugins-init.mjs`, format: 'esm' },
    ],
  },
  {
    ...commonInputOptions,
    input: 'src/plugins/init/index.ts',
    output: [
      { extend: true, file: `${outputPath}/plugins-init.cjs`, format: 'cjs' },
    ],
  },
  // config loader subpath
  {
    ...commonInputOptions,
    input: 'src/config/index.ts',
    output: [{ extend: true, file: `${outputPath}/config.mjs`, format: 'esm' }],
  },
  {
    ...commonInputOptions,
    input: 'src/config/index.ts',
    output: [{ extend: true, file: `${outputPath}/config.cjs`, format: 'cjs' }],
  },
  // env overlay subpath
  {
    ...commonInputOptions,
    input: 'src/env/overlay.ts',
    output: [
      { extend: true, file: `${outputPath}/env-overlay.mjs`, format: 'esm' },
    ],
  },
  {
    ...commonInputOptions,
    input: 'src/env/overlay.ts',
    output: [
      { extend: true, file: `${outputPath}/env-overlay.cjs`, format: 'cjs' },
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
  // Types: cliHost
  {
    ...commonInputOptions,
    input: 'src/cliHost/index.ts',
    plugins: [
      aliasPlugin({ entries: commonAliases }),
      ...commonPlugins,
      dtsPlugin(),
    ],
    output: [
      { extend: true, file: `${outputPath}/cliHost.d.ts`, format: 'esm' },
      { extend: true, file: `${outputPath}/cliHost.d.mts`, format: 'esm' },
      { extend: true, file: `${outputPath}/cliHost.d.cts`, format: 'cjs' },
    ],
  },
  // Types: plugins-batch
  {
    ...commonInputOptions,
    input: 'src/plugins/batch/index.ts',
    plugins: [
      aliasPlugin({ entries: commonAliases }),
      ...commonPlugins,
      dtsPlugin(),
    ],
    output: [
      { extend: true, file: `${outputPath}/plugins-batch.d.ts`, format: 'esm' },
      {
        extend: true,
        file: `${outputPath}/plugins-batch.d.mts`,
        format: 'esm',
      },
      {
        extend: true,
        file: `${outputPath}/plugins-batch.d.cts`,
        format: 'cjs',
      },
    ],
  },
  // Types: plugins-init
  {
    ...commonInputOptions,
    input: 'src/plugins/init/index.ts',
    plugins: [
      aliasPlugin({ entries: commonAliases }),
      ...commonPlugins,
      dtsPlugin(),
    ],
    output: [
      { extend: true, file: `${outputPath}/plugins-init.d.ts`, format: 'esm' },
      { extend: true, file: `${outputPath}/plugins-init.d.mts`, format: 'esm' },
      { extend: true, file: `${outputPath}/plugins-init.d.cts`, format: 'cjs' },
    ],
  },
  // Types: config
  {
    ...commonInputOptions,
    input: 'src/config/index.ts',
    plugins: [
      aliasPlugin({ entries: commonAliases }),
      ...commonPlugins,
      dtsPlugin(),
    ],
    output: [
      { extend: true, file: `${outputPath}/config.d.ts`, format: 'esm' },
      { extend: true, file: `${outputPath}/config.d.mts`, format: 'esm' },
      { extend: true, file: `${outputPath}/config.d.cts`, format: 'cjs' },
    ],
  },
  // Types: env-overlay
  {
    ...commonInputOptions,
    input: 'src/env/overlay.ts',
    plugins: [
      aliasPlugin({ entries: commonAliases }),
      ...commonPlugins,
      dtsPlugin(),
    ],
    output: [
      { extend: true, file: `${outputPath}/env-overlay.d.ts`, format: 'esm' },
      { extend: true, file: `${outputPath}/env-overlay.d.mts`, format: 'esm' },
      { extend: true, file: `${outputPath}/env-overlay.d.cts`, format: 'cjs' },
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
