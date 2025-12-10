import eslint from '@eslint/js';
import vitestPlugin from '@vitest/eslint-plugin';
import prettierConfig from 'eslint-config-prettier';
import jsonc from 'eslint-plugin-jsonc';
import prettierPlugin from 'eslint-plugin-prettier';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import tsdocPlugin from 'eslint-plugin-tsdoc';
import globals from 'globals';
import jsoncParser from 'jsonc-eslint-parser';
import { dirname } from 'path';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'url';
const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

// Extract rules from typescript-eslint strictTypeChecked (a flat-config array)
// into a single rules object in a type-safe way.
const strictConfigs = tseslint.configs
  .strictTypeChecked as unknown as Array<unknown>;
const strictTypeCheckedRules = strictConfigs.reduce<Record<string, unknown>>(
  (acc, cfg) => {
    const rules = (cfg as { rules?: Record<string, unknown> }).rules;
    if (rules) Object.assign(acc, rules);
    return acc;
  },
  {},
);
// Safely extract Vitest recommended rules for flat config usage.
const vitestRecommendedRules =
  (
    vitestPlugin as unknown as {
      configs?: { recommended?: { rules?: Record<string, unknown> } };
    }
  ).configs?.recommended?.rules ?? {};

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
  }, // Base JS rules (apply to JS; TS is handled by typed configs below)
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
        // Provide both the main project (source/tests) and a dedicated ESLint
        // project that includes templates/**/*.ts. This allows typed linting
        // for template files without bringing them into the build program.
        project: ['./tsconfig.json', './tsconfig.eslint.json'], // typed linting
        // Root for project paths above
        tsconfigRootDir,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      prettier: prettierPlugin,
      'simple-import-sort': simpleImportSortPlugin,
      tsdoc: tsdocPlugin,
    },
    rules: {
      // Strict type-checked baseline from typescript-eslint (merged above)
      ...strictTypeCheckedRules,
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-restricted-imports': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
        },
      ],
      'no-restricted-imports': 'off',
      'no-unused-vars': 'off',
      'prettier/prettier': 'error',
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',
      'tsdoc/syntax': 'error',
    },
  },
  // Vitest-specific rules for test files, with typed parser settings
  {
    files: ['**/*.test.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir,
      },
      // Re-assert globals in this block (flat config does not implicitly merge)
      globals: { ...globals.node, ...globals.es2024 },
    },
    plugins: {
      vitest: vitestPlugin,
    },
    rules: {
      // Apply Vitest recommended and allow projects to override locally if needed
      ...vitestRecommendedRules,
      // Keep Prettier alignment in tests as well if desired (optional)
      'prettier/prettier': 'error',
    },
  },
  prettierConfig,
];
