import { afterEach, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { server } from './mocks/server'

// Polyfill fetch to handle relative URLs in Node.js environment
const originalFetch = globalThis.fetch

beforeAll(() => {
  // Replace fetch with a version that handles relative URLs
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/')) {
      // Convert relative URLs to absolute for Node.js fetch
      input = `http://localhost${input}`
    }
    return originalFetch(input, init)
  }) as typeof fetch

  // Start MSW server
  server.listen({ onUnhandledRequest: 'error' })
})

// Reset handlers after each test
afterEach(() => {
  cleanup()
  server.resetHandlers()
})

// Stop MSW server after all tests
afterAll(() => {
  globalThis.fetch = originalFetch
  server.close()
})
