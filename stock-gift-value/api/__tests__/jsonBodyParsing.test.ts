/**
 * Coverage for the express.json() body-parsing layer used by
 * POST /api/log-client-error in api/server.ts.
 *
 * server.ts calls app.listen() at import time, so the middleware is exercised
 * directly here rather than by booting the real server. These tests pin the
 * body-parser behaviour that the endpoint depends on, so a future bump that
 * changes parsing or error semantics fails loudly.
 */

import { describe, it, expect } from 'vitest'
import express, { type Request, type Response } from 'express'
import { Readable } from 'node:stream'
import type { ClientErrorPayload } from '../../shared/types.js'

const BAD_REQUEST = 400

type ParsedRequest = Request & { body?: unknown }

/**
 * Build a minimal readable request that body-parser can consume.
 */
function makeRequest(body: string, contentType = 'application/json'): Request {
  const req = Readable.from([body]) as Readable & {
    headers: Record<string, string>
    method: string
    url: string
  }
  req.headers = {
    'content-type': contentType,
    'content-length': String(Buffer.byteLength(body)),
  }
  req.method = 'POST'
  req.url = '/api/log-client-error'
  return req as unknown as Request
}

/**
 * Run express.json() over a request and resolve with the parse outcome.
 */
async function parseBody(
  body: string,
  contentType?: string
): Promise<{ req: ParsedRequest; error?: Error & { status?: number } }> {
  const middleware = express.json()
  const req = makeRequest(body, contentType) as ParsedRequest
  const res = {} as Response

  return new Promise((resolve) => {
    middleware(req, res, (error?: unknown) => {
      resolve({
        req,
        ...(error ? { error: error as Error & { status?: number } } : {}),
      })
    })
  })
}

describe('express.json() body parsing', () => {
  it('should parse a client error payload into req.body', async () => {
    const payload: ClientErrorPayload = {
      type: 'unhandledrejection',
      message: 'Something broke',
      url: 'http://localhost:8080/',
      stack: 'Error: Something broke\n    at foo',
      timestamp: '2026-08-16T00:00:00.000Z',
      userAgent: 'vitest',
    }

    const { req, error } = await parseBody(JSON.stringify(payload))

    expect(error).toBeUndefined()
    expect(req.body).toEqual(payload)
  })

  it('should preserve nested additional context', async () => {
    const payload = {
      message: 'nested',
      additionalContext: { attempt: 2, tags: ['a', 'b'] },
    }

    const { req, error } = await parseBody(JSON.stringify(payload))

    expect(error).toBeUndefined()
    expect(req.body).toEqual(payload)
  })

  it('should reject malformed JSON with a 400 status', async () => {
    const { error } = await parseBody('{"message": "unterminated')

    expect(error).toBeDefined()
    expect(error?.status).toBe(BAD_REQUEST)
  })

  it('should yield an empty body when no JSON is sent', async () => {
    const { req, error } = await parseBody('')

    expect(error).toBeUndefined()
    expect(req.body).toEqual({})
  })

  it('should leave req.body unset when the body is not declared as JSON', async () => {
    const { req, error } = await parseBody('message=plain', 'text/plain')

    expect(error).toBeUndefined()
    // Note: unset rather than {} — the handler reads req.body without a guard,
    // so a non-JSON POST surfaces as a 500 rather than a 400.
    expect(req.body).toBeUndefined()
  })
})
