import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tsdoc from 'eslint-plugin-tsdoc';
import tseslint from 'typescript-eslint';

export default [
  // Global ignores (ensure build output and coverage are not linted)
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },

  // JavaScript base rules
  js.configs.recommended,

  // TypeScript (type-aware) rules applied only to TS files
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
      tsdoc,
    },
    rules: {
      // Prefer the TS-aware unused vars rule; disable the base
      '@typescript-eslint/no-unused-vars': 'error',
      'no-unused-vars': 'off',

      // Import/export ordering
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      // TSDoc
      'tsdoc/syntax': 'warn',
    },
  },

  // Prettier integration: disable rules that conflict with Prettier
  prettier,
];
