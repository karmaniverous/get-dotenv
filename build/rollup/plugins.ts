import type { Alias } from '@rollup/plugin-alias';
import aliasPlugin from '@rollup/plugin-alias';
import commonjsPlugin from '@rollup/plugin-commonjs';
import jsonPlugin from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescriptPlugin from '@rollup/plugin-typescript';
import type { Plugin } from 'rollup';
import copy from 'rollup-plugin-copy';

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
export function createCommonPlugins(options: {
  aliases: Alias[];
  outputPath: string;
  includeCopy?: boolean;
}): Plugin[] {
  const { aliases, outputPath, includeCopy = true } = options;

  const plugins: Plugin[] = [
    aliasPlugin({ entries: aliases }),
    commonjsPlugin(),
    jsonPlugin(),
    nodeResolve(),
    createLibraryTsPlugin(),
  ];

  if (includeCopy) {
    plugins.push(
      copy({
        targets: [{ src: 'templates/**/*', dest: `${outputPath}/templates` }],
        copyOnce: true,
        verbose: true,
      }) as unknown as Plugin,
    );
  }

  return plugins;
}
