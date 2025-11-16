import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

/**
 * Global error handler for production error tracking
 * Sends client-side errors to the server for logging
 */

interface ClientErrorPayload {
  message: string
  stack?: string
  url: string
  lineNumber?: number
  columnNumber?: number
  timestamp: string
  userAgent: string
  type: 'error' | 'unhandledrejection'
  additionalContext?: Record<string, unknown>
}

/**
 * Sends error details to the server for logging
 */
async function logErrorToServer(
  errorPayload: ClientErrorPayload
): Promise<void> {
  try {
    // Use relative URL - Vite proxy will forward to correct port in development
    // In production, this goes to the same server serving the app
    await fetch('/api/log-client-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorPayload),
    })
  } catch (error) {
    // Silently fail - don't want error logging to cause more errors
    console.error('Failed to log error to server:', error)
  }
}

/**
 * Global error handler for uncaught exceptions
 */
window.onerror = (message, source, lineno, colno, error) => {
  const errorPayload: ClientErrorPayload = {
    message: typeof message === 'string' ? message : 'Unknown error',
    url: source ?? window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    type: 'error',
  }

  if (error?.stack) {
    errorPayload.stack = error.stack
  }

  if (lineno !== undefined) {
    errorPayload.lineNumber = lineno
  }

  if (colno !== undefined) {
    errorPayload.columnNumber = colno
  }

  void logErrorToServer(errorPayload)

  // Return false to allow default error handling
  return false
}

/**
 * Global handler for unhandled promise rejections
 */
window.onunhandledrejection = (event) => {
  // Safely extract error information from the rejection reason
  const reason = event.reason as unknown
  const isError = reason instanceof Error
  const message = isError ? reason.message : String(reason)
  const stack = isError ? reason.stack : undefined

  const errorPayload: ClientErrorPayload = {
    message: message || 'Unhandled promise rejection',
    url: window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    type: 'unhandledrejection',
    additionalContext: {
      reason: isError ? undefined : reason,
    },
  }

  if (stack) {
    errorPayload.stack = stack
  }

  void logErrorToServer(errorPayload)
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Failed to find the root element')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
