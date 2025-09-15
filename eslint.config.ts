import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import jsonc from 'eslint-plugin-jsonc';
import prettierPlugin from 'eslint-plugin-prettier';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import jsoncParser from 'jsonc-eslint-parser';
import { dirname } from 'path';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'url';

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default [
  // Make Node globals (process, console, etc.) available project-wide
  {
    languageOptions: { globals: { ...globals.node, ...globals.es2024 } },
  },
  {
    ignores: [
      '.stan/**',
      '**/.tsbuild/**',
      '**/.rollup.cache/**',
      'coverage/**',
      'dist/**',
      'docs/**',
      'node_modules/**',
    ],
  },
  // Base JS rules (apply to JS; TS is handled by typed configs below)
  eslint.configs.recommended,

  // Lint JSON using jsonc parser, apply Prettier to JSON
  {
    files: ['**/*.json'],
    languageOptions: {
      parser: jsoncParser,
    },
    plugins: {
      jsonc,
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },

  // Apply Prettier to JS files too
  {
    files: ['**/*.{js,cjs,mjs}'],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
    },
  },

  // Typed TypeScript rules (scoped to TS files only)
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      // Important: set the TS parser here, otherwise this block replaces the
      // parser from strictTypeChecked and the CLI falls back to espree.
      parser: tseslint.parser,
      parserOptions: {
        // Be explicit so the CLI loads type info from the root project.
        project: ['./tsconfig.json'], // typed linting
        tsconfigRootDir,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      prettier: prettierPlugin,
      'simple-import-sort': simpleImportSortPlugin,
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-unused-vars': 'off',
      'prettier/prettier': 'error',
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
    },
  },
  prettierConfig,
];
