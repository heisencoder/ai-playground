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
        // Entry points (not directly testable)
        'src/main.tsx',
        'src/App.tsx',
        'api/server.ts',
      ],
      all: true,
      thresholds: {
        // Note: Vitest doesn't support separate global vs per-file thresholds
        // 90% for lines/functions/statements, 85% for branches (harder to cover)
        // Applies to both global aggregate and per-file
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
        perFile: true,
      },
    },
  },
})
