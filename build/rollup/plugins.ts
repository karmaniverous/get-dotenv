import type { Alias } from '@rollup/plugin-alias';
import aliasPlugin from '@rollup/plugin-alias';
import commonjsPlugin from '@rollup/plugin-commonjs';
import jsonPlugin from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescriptPlugin from '@rollup/plugin-typescript';
import type { Plugin } from 'rollup';

/**
 * Create the shared TypeScript plugin used by Rollup library builds.
 *
 * This mirrors the previous rollup.config.ts behavior:
 * - Uses tsconfig.base.json for library compilation.
 * - Unsets outDir to satisfy \@rollup/plugin-typescript path validation.
 * - Limits compilation to src/** and excludes templates/tests/tools/dist outputs.
 */
export function createLibraryTsPlugin(): Plugin {
  return typescriptPlugin({
    tsconfig: './tsconfig.base.json',
    compilerOptions: { outDir: undefined },
    include: ['src/**/*.ts'],
    exclude: [
      'templates/**',
      'test/**',
      '.stan/**',
      'tools/**',
      'build/**',
      'dist/**',
      'esm/**',
    ],
  });
}

/**
 * Create the shared Rollup plugin list for library builds.
 */
export function createCommonPlugins(options: { aliases: Alias[] }): Plugin[] {
  const { aliases } = options;

  return [
    aliasPlugin({ entries: aliases }),
    commonjsPlugin(),
    jsonPlugin(),
    nodeResolve(),
    createLibraryTsPlugin(),
  ];
}
