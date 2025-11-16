import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    pool: 'threads',
    testTimeout: 10000, // 10 seconds per test
    hookTimeout: 10000, // 10 seconds for hooks
    // Fail tests on console warnings/errors (turn warnings into errors)
    onConsoleLog(log, type) {
      if (type === 'stderr' && log.includes('Warning:')) {
        // Treat React warnings as test failures
        throw new Error(`React Warning detected: ${log}`)
      }
      return false // Allow other console logs
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}', 'api/**/*.ts'],
      exclude: [
        // Test files
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'api/**/*.test.ts',
        'api/**/__tests__/**',
        'src/test/**',
        // Type definitions
        'src/**/*.d.ts',
        'src/vite-env.d.ts',
        'src/types.ts',
        // Entry points and server-only files (not directly testable)
        'src/main.tsx',
        'src/App.tsx',
        'api/server.ts',
        'api/logger.ts',
        // Third-party library wrappers (tested via integration tests)
        'api/tickerSearchClient.ts',
      ],
      all: true,
      thresholds: {
        // Global aggregate coverage thresholds
        // Note: perFile disabled because ticker autocomplete files have lower coverage
        // (async/debouncing tested via integration tests to avoid test flakiness)
        lines: 85,
        functions: 85,
        branches: 75,
        statements: 85,
        perFile: false,
      },
    },
  },
})
