import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tsdoc from 'eslint-plugin-tsdoc';
import tseslint from 'typescript-eslint';

export default [
  // Global ignores to avoid linting build artifacts and caches.
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '.rollup.cache/**'],
  },

  // Base JS rules.
  js.configs.recommended,

  // Type-aware TS rules. Apply strict + stylistic with type info to TS only,
  // and provide parserOptions.project to enable typed linting.
  ...tseslint.configs.strictTypeChecked.map((c) => ({
    ...c,
    languageOptions: {
      ...(c.languageOptions ?? {}),
      parserOptions: {
        ...(c.languageOptions?.parserOptions ?? {}),
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  })),
  ...tseslint.configs.stylisticTypeChecked.map((c) => ({
    ...c,
    languageOptions: {
      ...(c.languageOptions ?? {}),
      parserOptions: {
        ...(c.languageOptions?.parserOptions ?? {}),
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  })),

  // Project-specific TS rules and plugins.
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      'simple-import-sort': simpleImportSort,
      tsdoc,
    },
    rules: {
      // Prefer TS-aware unused-vars and disable the base rule.
      '@typescript-eslint/no-unused-vars': 'error',
      'no-unused-vars': 'off',

      // Import/export ordering
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      // TSDoc
      'tsdoc/syntax': 'warn',
    },
  },

  // Prettier integration (turns off conflicting rules).
  prettier,
];
