import { builtinModules } from 'node:module';

import type { Alias } from '@rollup/plugin-alias';
import aliasPlugin from '@rollup/plugin-alias';
import commonjsPlugin from '@rollup/plugin-commonjs';
import jsonPlugin from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescriptPlugin from '@rollup/plugin-typescript';
import fs from 'fs-extra';
import type { InputOptions, RollupOptions } from 'rollup';
import copy from 'rollup-plugin-copy';
import dtsPlugin from 'rollup-plugin-dts';
// Avoid JSON import assertions; read and type package.json

const outputPath = `dist`;
// Configure the TS plugin explicitly for Rollup builds:
// - Point to the base tsconfig to avoid project "outDir" constraints intended for tsc.
// - Unset outDir so @rollup/plugin-typescript doesn't error on path validation.
const tsPlugin = typescriptPlugin({
  tsconfig: './tsconfig.base.json',
  compilerOptions: { outDir: undefined },
  // Limit compilation to library sources; exclude templates/tests/.stan/tools and outputs.
  include: ['src/**/*.ts'],
  exclude: [
    'templates/**',
    'test/**',
    '.stan/**',
    'tools/**',
    'dist/**',
    'esm/**',
  ],
});
const commonPlugins = [
  commonjsPlugin(),
  jsonPlugin(),
  nodeResolve(),
  tsPlugin,
  // Copy templates verbatim into dist/templates (no compilation)
  copy({
    targets: [{ src: 'templates/**/*', dest: `${outputPath}/templates` }],
    copyOnce: true,
    verbose: true,
  }),
];

// Map TS path aliases for Rollup bundling.
// tsconfig.json defines "@/*" -> "*" (e.g., "@/src/..." -> "src/...").
// Tests (Vitest) use vite-tsconfig-paths; Rollup needs an explicit alias.
const commonAliases: Alias[] = [
  { find: /^@\//, replacement: '' }, // "@/foo/bar" -> "foo/bar"
];
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
  // ESM outputs.
  {
    ...commonInputOptions,
    output: [
      {
        extend: true,
        file: `${outputPath}/index.mjs`,
        format: 'esm',
        inlineDynamicImports: true,
      },
    ],
  },

  // cliHost subpath (ESM/CJS)
  {
    ...commonInputOptions,
    input: 'src/cliHost/index.ts',
    output: [
      {
        extend: true,
        file: `${outputPath}/cliHost.mjs`,
        format: 'esm',
        inlineDynamicImports: true,
      },
    ],
  },
  // plugins/batch subpath
  {
    ...commonInputOptions,
    input: 'src/plugins/batch/index.ts',
    output: [
      {
        extend: true,
        file: `${outputPath}/plugins-batch.mjs`,
        format: 'esm',
        inlineDynamicImports: true,
      },
    ],
  },
  // plugins/aws subpath
  {
    ...commonInputOptions,
    input: 'src/plugins/aws/index.ts',
    output: [
      {
        extend: true,
        file: `${outputPath}/plugins-aws.mjs`,
        format: 'esm',
        inlineDynamicImports: true,
      },
    ],
  },

  // plugins/cmd subpath
  {
    ...commonInputOptions,
    input: 'src/plugins/cmd/index.ts',
    output: [
      {
        extend: true,
        file: `${outputPath}/plugins-cmd.mjs`,
        format: 'esm',
        inlineDynamicImports: true,
      },
    ],
  },
  // plugins/init subpath
  {
    ...commonInputOptions,
    input: 'src/plugins/init/index.ts',
    output: [
      {
        extend: true,
        file: `${outputPath}/plugins-init.mjs`,
        format: 'esm',
        inlineDynamicImports: true,
      },
    ],
  },

  // plugins barrel (ESM/CJS)
  {
    ...commonInputOptions,
    input: 'src/plugins/index.ts',
    output: [
      {
        extend: true,
        file: `${outputPath}/plugins.mjs`,
        format: 'esm',
        inlineDynamicImports: true,
      },
    ],
  },

  // config loader subpath
  {
    ...commonInputOptions,
    input: 'src/config/index.ts',
    output: [
      {
        extend: true,
        file: `${outputPath}/config.mjs`,
        format: 'esm',
        inlineDynamicImports: true,
      },
    ],
  },
  // env overlay subpath
  {
    ...commonInputOptions,
    input: 'src/env/index.ts',
    output: [
      {
        extend: true,
        file: `${outputPath}/env-overlay.mjs`,
        format: 'esm',
        inlineDynamicImports: true,
      },
    ],
  },

  // Type definitions output.
  {
    ...commonInputOptions,
    plugins: [
      aliasPlugin({ entries: commonAliases }),
      ...commonPlugins,
      dtsPlugin({ tsconfig: './tsconfig.base.json' }),
    ],
    output: [
      {
        extend: true,
        file: `${outputPath}/index.d.ts`,
        format: 'esm',
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
      dtsPlugin({ tsconfig: './tsconfig.base.json' }),
    ],
    output: [
      { extend: true, file: `${outputPath}/cliHost.d.ts`, format: 'esm' },
    ],
  },
  // Types: plugins-batch
  {
    ...commonInputOptions,
    input: 'src/plugins/batch/index.ts',
    plugins: [
      aliasPlugin({ entries: commonAliases }),
      ...commonPlugins,
      dtsPlugin({ tsconfig: './tsconfig.base.json' }),
    ],
    output: [
      { extend: true, file: `${outputPath}/plugins-batch.d.ts`, format: 'esm' },
    ],
  },
  // Types: plugins-aws
  {
    ...commonInputOptions,
    input: 'src/plugins/aws/index.ts',
    plugins: [
      aliasPlugin({ entries: commonAliases }),
      ...commonPlugins,
      dtsPlugin({ tsconfig: './tsconfig.base.json' }),
    ],
    output: [
      { extend: true, file: `${outputPath}/plugins-aws.d.ts`, format: 'esm' },
    ],
  },

  // Types: plugins-init
  {
    ...commonInputOptions,
    input: 'src/plugins/init/index.ts',
    plugins: [
      aliasPlugin({ entries: commonAliases }),
      ...commonPlugins,
      dtsPlugin({ tsconfig: './tsconfig.base.json' }),
    ],
    output: [
      { extend: true, file: `${outputPath}/plugins-init.d.ts`, format: 'esm' },
    ],
  },
  // Types: plugins-cmd
  {
    ...commonInputOptions,
    input: 'src/plugins/cmd/index.ts',
    plugins: [
      aliasPlugin({ entries: commonAliases }),
      ...commonPlugins,
      dtsPlugin({ tsconfig: './tsconfig.base.json' }),
    ],
    output: [
      { extend: true, file: `${outputPath}/plugins-cmd.d.ts`, format: 'esm' },
    ],
  },
  // Types: config
  {
    ...commonInputOptions,
    input: 'src/config/index.ts',
    plugins: [
      aliasPlugin({ entries: commonAliases }),
      ...commonPlugins,
      dtsPlugin({ tsconfig: './tsconfig.base.json' }),
    ],
    output: [
      { extend: true, file: `${outputPath}/config.d.ts`, format: 'esm' },
    ],
  },
  // Types: env-overlay
  {
    ...commonInputOptions,
    input: 'src/env/index.ts',
    plugins: [
      aliasPlugin({ entries: commonAliases }),
      ...commonPlugins,
      dtsPlugin({ tsconfig: './tsconfig.base.json' }),
    ],
    output: [
      { extend: true, file: `${outputPath}/env-overlay.d.ts`, format: 'esm' },
    ],
  },

  // Types: plugins barrel
  {
    ...commonInputOptions,
    input: 'src/plugins/index.ts',
    plugins: [
      aliasPlugin({ entries: commonAliases }),
      ...commonPlugins,
      dtsPlugin({ tsconfig: './tsconfig.base.json' }),
    ],
    output: [
      { extend: true, file: `${outputPath}/plugins.d.ts`, format: 'esm' },
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
        inlineDynamicImports: true,
      },
    ],
  })),
];

export default config;
