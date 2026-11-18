import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/** Web and Node APIs that do not exist in the Apps Script V8 runtime. */
const NOT_IN_APPS_SCRIPT = [
  'URL',
  'URLSearchParams',
  'fetch',
  'setTimeout',
  'setInterval',
  'TextEncoder',
  'TextDecoder',
  'process',
  'Buffer',
  'require',
].map((name) => ({
  name,
  message: `${name} is not available in the Apps Script runtime.`,
}))

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: ['./tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      complexity: ['error', 15],
      'max-depth': ['error', 4],
      'max-params': ['error', 5],
      'max-lines-per-function': [
        'error',
        { max: 100, skipBlankLines: true, skipComments: true },
      ],
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-param-reassign': ['error', { props: false }],
      'no-else-return': 'error',
    },
  },

  // Code that ships to Apps Script: no Node or browser globals.
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...NOT_IN_APPS_SCRIPT],
    },
  },

  // The core must stay free of Apps Script services so it runs under Node.
  {
    files: ['src/core/**/*.ts', 'src/drive/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...NOT_IN_APPS_SCRIPT,
        ...[
          'SpreadsheetApp',
          'DriveApp',
          'Drive',
          'UrlFetchApp',
          'ScriptApp',
          'PropertiesService',
          'LockService',
          'Utilities',
          'Session',
          'Logger',
        ].map((name) => ({
          name,
          message: `${name} belongs in src/gas; the core takes it as a dependency.`,
        })),
      ],
    },
  },

  {
    files: ['test/**/*.ts'],
    rules: {
      'max-lines-per-function': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  {
    files: ['*.mjs', '*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  }
)
