import tsconfigPaths from 'vite-tsconfig-paths';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    // Avoid picking up transformed caches and keep node_modules excluded
    exclude: [
      ...configDefaults.exclude,
      '**/.tsbuild/**',
      '**/.rollup.cache/**',
    ],
    coverage: {
      provider: 'v8',
      exclude: [
        'docs/**',
        'dist/**',
        'esm/**',
        '.stan/**',
        '**/*.d.ts',
        'rollup.config.ts',
        'eslint.config.ts',
        'src/cli/**',
      ],
    },
  },
});
