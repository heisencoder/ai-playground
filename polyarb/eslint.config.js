import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // Global ignores
  {
    ignores: ['dist/**', 'coverage/**', 'eslint.config.js'],
  },

  // Base JavaScript recommended rules
  js.configs.recommended,

  // TypeScript recommended rules with type checking
  ...tseslint.configs.recommendedTypeChecked,

  // Main configuration for TypeScript files
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        project: ['./tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript specific - Maximum strictness
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-redundant-type-constituents': 'error',

      // Code quality rules - Strict but realistic
      complexity: ['error', 15],
      'max-depth': ['error', 4],
      'max-lines-per-function': [
        'error',
        { max: 100, skipBlankLines: true, skipComments: true },
      ],
      'max-nested-callbacks': ['error', 3],
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-return-await': 'off', // Handled by @typescript-eslint/return-await
      'require-await': 'off', // Handled by @typescript-eslint/require-await
      'no-throw-literal': 'off', // Handled by @typescript-eslint/only-throw-error
      'prefer-promise-reject-errors': 'error',

      // Best practices
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'off', // Handled by @typescript-eslint/no-unused-expressions
      'no-useless-return': 'error',
      'no-magic-numbers': [
        'error',
        {
          ignore: [0, 1, -1, 2, 10, 100, 1000],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          enforceConst: true,
        },
      ],
      curly: ['error', 'all'],
      'default-case': 'error',
      'dot-notation': 'off', // Handled by @typescript-eslint/dot-notation
      'guard-for-in': 'error',
      'no-else-return': 'error',
      'no-empty-function': 'off', // Handled by @typescript-eslint/no-empty-function
      'no-param-reassign': ['error', { props: false }],
      'no-return-assign': 'error',
      'no-sequences': 'error',
      radix: 'error',
    },
  },

  // Override for test files
  {
    files: ['**/__tests__/**/*.ts', '**/*.test.ts'],
    rules: {
      'max-lines-per-function': [
        'error',
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
      'max-nested-callbacks': ['error', 5],
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },

  // Override for fixture files
  {
    files: ['**/fixtures/**/*.ts'],
    rules: {
      'no-magic-numbers': 'off',
      'max-lines-per-function': 'off',
    },
  },

  // Override for CLI entry point
  {
    files: ['**/cli/index.ts'],
    rules: {
      'no-console': 'off',
    },
  }
)
