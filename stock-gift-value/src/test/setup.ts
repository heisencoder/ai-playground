import { afterEach, beforeAll, afterAll } from 'vitest'
import { act, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { server } from './mocks/server'

// Polyfill fetch to handle relative URLs in Node.js environment
const originalFetch = globalThis.fetch

// Upper bound on how long the post-test drain waits for in-flight requests.
const DRAIN_TIMEOUT_MS = 500
// MSW reports 'request:end' before the app's own continuation (response.json()
// and the state write that follows) has run, so quiescence alone is not enough.
// These extra turns give that chain room to finish inside the act() scope.
const DRAIN_TRAILING_TURNS = 5

// Number of mocked requests that have started but not yet been responded to.
let inFlightRequests = 0

/**
 * Yield one macrotask turn.
 */
function nextTurn(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
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

  server.events.on('request:start', () => {
    inFlightRequests += 1
  })
  server.events.on('request:end', () => {
    inFlightRequests -= 1
  })

  // Start MSW server
  server.listen({ onUnhandledRequest: 'error' })
})

// Reset handlers after each test
afterEach(async () => {
  // A test can end with a price fetch still in flight. Between the test body
  // finishing and cleanup() unmounting the tree there is a yield to the event
  // loop, and a response landing in that window updates a still-mounted
  // component outside act() -- which vite.config's onConsoleLog turns into a
  // failure. Draining inside act() puts any such update in an act scope;
  // anything still outstanding resolves after unmount, where the hooks
  // themselves drop it.
  await act(async () => {
    const deadline = Date.now() + DRAIN_TIMEOUT_MS
    while (inFlightRequests > 0 && Date.now() < deadline) {
      await nextTurn()
    }
    for (let turn = 0; turn < DRAIN_TRAILING_TURNS; turn += 1) {
      await nextTurn()
    }
  })
  cleanup()
  inFlightRequests = 0
  server.resetHandlers()
})

// Stop MSW server after all tests
afterAll(() => {
  globalThis.fetch = originalFetch
  server.close()
})
