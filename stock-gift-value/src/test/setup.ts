import { afterEach, beforeAll, beforeEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { format } from 'node:util'
import '@testing-library/jest-dom/vitest'
import { server } from './mocks/server'

// Polyfill fetch to handle relative URLs in Node.js environment
const originalFetch = globalThis.fetch

// Fail any test that triggers a React warning, such as a state update outside
// act(). This runs inside the test worker rather than in a reporter hook, so it
// still works where Vitest's console interception drops test output, and it
// fails the test that caused the warning instead of whichever test is running
// when the log reaches the reporter.
const REACT_WARNING_PREFIX = 'Warning:'
const originalConsoleError = console.error
const originalConsoleWarn = console.warn
let reactWarnings: string[] = []

function failOnReactWarnings(
  original: (...args: unknown[]) => void
): (...args: unknown[]) => void {
  return (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].startsWith(REACT_WARNING_PREFIX)
    ) {
      reactWarnings.push(format(...args))
    }
    original(...args)
  }
}

beforeAll(() => {
  // Replace fetch with a version that handles relative URLs
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    let url = input
    if (typeof url === 'string' && url.startsWith('/')) {
      // Convert relative URLs to absolute for Node.js fetch
      url = `http://localhost${url}`
    }
    return originalFetch(url, init)
  }) as typeof fetch

  console.error = failOnReactWarnings(originalConsoleError)
  console.warn = failOnReactWarnings(originalConsoleWarn)

  // Start MSW server
  server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  reactWarnings = []
})

// Reset handlers after each test
afterEach(() => {
  cleanup()
  server.resetHandlers()

  if (reactWarnings.length > 0) {
    throw new Error(`React warning detected:\n${reactWarnings.join('\n\n')}`)
  }
})

// Stop MSW server after all tests
afterAll(() => {
  globalThis.fetch = originalFetch
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
  server.close()
})
