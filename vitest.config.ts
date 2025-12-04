import tsconfigPaths from 'vite-tsconfig-paths';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    onConsoleLog(_log, _type) {
      // Show console output only for failing tests; suppress otherwise.
      // Vitest types expose (log, type); some runtimes also pass a third 'task'.
      // Access via arguments[2] when present to detect failing tasks.
      // eslint-disable-next-line prefer-rest-params
      const maybeArgs = arguments as unknown as IArguments;
      const task =
        (maybeArgs[2] as { result?: { state?: string } } | undefined) ??
        undefined;
      const state = task?.result?.state;
      if (state === 'fail') return;
      return false;
    },
    environment: 'node',
    // Avoid picking up transformed caches and keep node_modules excluded
    exclude: [
      ...configDefaults.exclude,
      '**/.tsbuild/**',
      '**/.rollup.cache/**',
    ],
    coverage: {
      provider: 'v8',
      // Only collect coverage for library source files.
      include: ['src/**/*.ts'],
      // Exclude caches, build artifacts, templates, tools, tests, and config files.
      exclude: [
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.rc.*',
        'vitest.config.ts',
        'rollup.config.ts',
        'eslint.config.ts',
        'dist/**',
        'esm/**',
        '.stan/**',
        '.tsbuild/**',
        '**/.tsbuild/**',
        '**/.rollup.cache/**',
        'templates/**',
        'tools/**',
        'test/**',
        // CLI entrypoints are distributed but not part of unit under test coverage
        // (E2E tests exercise these paths separately).
        'src/cli/**',
        'docs/**',
      ],
    },
    testTimeout: 20_000,
  },
});
