/**
 * Logging utilities for the server
 * Provides console methods that are allowed by ESLint rules
 */

export const logger = {
  info(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.log(...args)
  },

  warn(...args: unknown[]): void {
    console.warn(...args)
  },

  error(...args: unknown[]): void {
    console.error(...args)
  },
}
