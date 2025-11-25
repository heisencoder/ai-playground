import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  // Global ignores
  {
    ignores: ["dist/**", "dist-server/**", "coverage/**", "eslint.config.js"],
  },

  // Base JavaScript recommended rules
  js.configs.recommended,

  // TypeScript recommended rules with type checking
  ...tseslint.configs.recommendedTypeChecked,

  // Main configuration for TypeScript files
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
      parserOptions: {
        project: [
          "./tsconfig.json",
          "./tsconfig.server.json",
          "./tsconfig.test.json",
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // React Hooks rules
      ...reactHooks.configs.recommended.rules,

      // React Refresh rules
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      // TypeScript specific - Maximum strictness
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",
      // Disable new v8 rule not present in original config
      "@typescript-eslint/no-redundant-type-constituents": "off",
      // Allow underscore-prefixed variables to be unused
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Code quality rules - Strict but realistic
      complexity: ["error", 15],
      "max-depth": ["error", 4],
      "max-lines-per-function": [
        "error",
        { max: 100, skipBlankLines: true, skipComments: true },
      ],
      "max-nested-callbacks": ["error", 3],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "error",
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-return-await": "off", // Handled by @typescript-eslint/return-await
      "require-await": "off", // Handled by @typescript-eslint/require-await
      "no-throw-literal": "off", // Handled by @typescript-eslint/only-throw-error
      "prefer-promise-reject-errors": "error",

      // Best practices
      "no-duplicate-imports": "error",
      "no-unused-expressions": "off", // Handled by @typescript-eslint/no-unused-expressions
      "no-useless-return": "error",
      "no-magic-numbers": [
        "error",
        {
          ignore: [0, 1, -1, 2, 10, 100, 1000, 2000, 3000, 5000],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          enforceConst: true,
        },
      ],
      curly: ["error", "all"],
      "default-case": "error",
      "dot-notation": "off", // Handled by @typescript-eslint/dot-notation
      "guard-for-in": "error",
      "no-else-return": "error",
      "no-empty-function": "off", // Handled by @typescript-eslint/no-empty-function
      "no-param-reassign": ["error", { props: false }],
      "no-return-assign": "error",
      "no-sequences": "error",
      radix: "error",
    },
  },

  // Override for StockGiftCalculator.tsx
  {
    files: ["**/StockGiftCalculator.tsx"],
    rules: {
      "max-lines-per-function": [
        "error",
        { max: 200, skipBlankLines: true, skipComments: true },
      ],
    },
  },

  // Override for vite.config.ts
  {
    files: ["vite.config.ts"],
    rules: {
      "no-magic-numbers": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },

  // Override for test files
  {
    files: [
      "**/__tests__/**/*.ts",
      "**/__tests__/**/*.tsx",
      "**/*.test.ts",
      "**/*.test.tsx",
    ],
    rules: {
      "max-lines-per-function": [
        "error",
        { max: 200, skipBlankLines: true, skipComments: true },
      ],
    },
  }
);
