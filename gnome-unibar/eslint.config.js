import js from '@eslint/js';
import globals from 'globals';

const gjsGlobals = {
    ARGV: 'readonly',
    Debugger: 'readonly',
    GIRepositoryGType: 'readonly',
    globalThis: 'readonly',
    imports: 'readonly',
    Intl: 'readonly',
    log: 'readonly',
    logError: 'readonly',
    pkg: 'readonly',
    print: 'readonly',
    printerr: 'readonly',
    window: 'readonly',
};

export default [
    {
        ignores: ['node_modules/**', 'coverage/**', 'dist/**', '*.zip'],
    },
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            globals: {
                ...gjsGlobals,
            },
        },
        rules: {
            'no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            'no-console': 'warn',
            'no-var': 'error',
            'prefer-const': 'error',
            eqeqeq: ['error', 'smart'],
            curly: ['error', 'all'],
            'no-implicit-coercion': 'error',
            'no-throw-literal': 'error',
            'prefer-arrow-callback': 'error',
            'prefer-template': 'error',
        },
    },
    {
        files: ['src/**/*.js'],
        languageOptions: {
            globals: {
                ...gjsGlobals,
            },
        },
    },
    {
        files: ['test/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'no-console': 'off',
        },
    },
    {
        files: ['scripts/**/*.js', '*.config.js'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
];
