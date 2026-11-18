import { describe, expect, it } from 'vitest'
import { DisallowedOperationError, DriveError } from '../../src/core/errors'
import type { HttpRequest, HttpResponse } from '../../src/drive/client'
import {
  ALLOWED_REQUESTS,
  DRIVE_BASE_URL,
  DriveClient,
  assertAllowed,
} from '../../src/drive/client'
import { FakeDrive, MY_DRIVE_ROOT } from '../fakes/fakeDrive'

function scripted(responses: HttpResponse[]): {
  client: DriveClient
  sent: HttpRequest[]
  sleeps: number[]
} {
  const sent: HttpRequest[] = []
  const sleeps: number[] = []
  const queue = [...responses]
  const client = new DriveClient({
    transport: (request) => {
      sent.push(request)
      return queue.shift() ?? { status: 200, body: '{}' }
    },
    sleep: (ms) => sleeps.push(ms),
    readOnly: false,
    random: () => 0.5,
  })
  return { client, sent, sleeps }
}

const rateLimited: HttpResponse = {
  status: 403,
  body: JSON.stringify({
    error: {
      message: 'Slow down',
      errors: [{ reason: 'userRateLimitExceeded' }],
    },
  }),
}

describe('allow-list', () => {
  const url = (path: string): string => `${DRIVE_BASE_URL}${path}`

  it.each([
    ['DELETE', '/files/abc123'],
    ['POST', '/files/abc123/permissions'],
    ['POST', '/files/trash'],
    ['PATCH', '/drives/abc123'],
    ['GET', '/files/abc123/revisions'],
    ['POST', '/files/abc123/comments/c1'],
  ])('blocks %s %s', (method, path) => {
    const request = { method, url: url(path) } as HttpRequest

    expect(() => {
      assertAllowed(request, false)
    }).toThrow(DisallowedOperationError)
  })

  it('blocks a request to any other host', () => {
    expect(() => {
      assertAllowed(
        { method: 'GET', url: 'https://evil.example/drive/v3/files' },
        false
      )
    }).toThrow(/not an operation this tool performs/)
  })

  it.each(['trashed', 'permissions', 'permissionIds'])(
    'blocks a body that sets %s',
    (field) => {
      const request: HttpRequest = {
        method: 'PATCH',
        url: url('/files/abc123?supportsAllDrives=true'),
        body: JSON.stringify({ [field]: true }),
      }

      expect(() => {
        assertAllowed(request, false)
      }).toThrow(`tried to set "${field}"`)
    }
  )

  it('lets every read through in read-only mode and no write', () => {
    const samples: Record<string, string> = {
      'GET /^\\/about$/': '/about',
      'GET /^\\/files$/': '/files',
      'POST /^\\/files$/': '/files',
    }
    for (const rule of ALLOWED_REQUESTS) {
      const path =
        samples[`${rule.method} ${String(rule.path)}`] ??
        rule.path.source
          .replace(/^\^|\$$/g, '')
          .replace(/\\\//g, '/')
          .replace(/\[A-Za-z0-9_-\]\+/g, 'id123')
      const request: HttpRequest = { method: rule.method, url: url(path) }
      const attempt = (): void => {
        assertAllowed(request, true)
      }
      if (rule.write) {
        expect(attempt).toThrow(/read-only run/)
      } else {
        expect(attempt).not.toThrow()
      }
    }
  })

  it('never sends a blocked request', () => {
    const drive = new FakeDrive()
    const client = new DriveClient({
      transport: drive.handle,
      sleep: () => undefined,
      readOnly: true,
    })

    expect(() => client.moveFile('f1', 'p2', ['p1'])).toThrow(
      DisallowedOperationError
    )
    expect(() =>
      client.copyFile('f1', {
        name: 'n',
        parentId: 'p',
        description: '',
        properties: {},
        copyComments: true,
      })
    ).toThrow(DisallowedOperationError)
    expect(() => client.createComment('f1', 'hi')).toThrow(
      DisallowedOperationError
    )
    expect(() => client.createReply('f1', 'c1', 'hi', true)).toThrow(
      DisallowedOperationError
    )
    expect(() => client.createShortcut('n', 'p', 't', 's')).toThrow(
      DisallowedOperationError
    )
    expect(drive.requests).toEqual([])
  })
})

describe('requests', () => {
  it('builds a move as a parent change that keeps the file', () => {
    const { client, sent } = scripted([])

    client.moveFile('file123', 'newParent', ['oldParent', 'another'])

    expect(sent[0]?.method).toBe('PATCH')
    expect(sent[0]?.url).toContain(
      '/files/file123?addParents=newParent&removeParents=oldParent%2Canother'
    )
    expect(sent[0]?.url).toContain('supportsAllDrives=true')
    expect(sent[0]?.body).toBe('{}')
  })

  it('asks Drive to copy comments and tags the copy with its source', () => {
    const { client, sent } = scripted([])

    client.copyFile('file123', {
      name: "Q&A / 100% 'done'",
      parentId: 'dest',
      description: 'from elsewhere',
      properties: { dmSourceId: 'file123' },
      copyComments: true,
    })

    expect(sent[0]?.url).toContain('/files/file123/copy?')
    expect(sent[0]?.url).toContain('copyComments=true')
    expect(JSON.parse(sent[0]?.body ?? '{}')).toEqual({
      name: "Q&A / 100% 'done'",
      parents: ['dest'],
      description: 'from elsewhere',
      properties: { dmSourceId: 'file123' },
    })
  })

  it('scopes a destination listing to the shared drive', () => {
    const { client, sent } = scripted([])

    client.listChildren('folder1', 'drive9')

    const url = sent[0]?.url ?? ''
    expect(url).toContain('corpora=drive&driveId=drive9')
    expect(url).toContain('includeItemsFromAllDrives=true')
    expect(decodeURIComponent(url)).toContain(
      "q='folder1' in parents and trashed = false"
    )
  })

  it('follows page tokens until the listing is complete', () => {
    const drive = new FakeDrive()
    const folder = drive.addFolder('Many', MY_DRIVE_ROOT)
    for (let index = 0; index < 7; index += 1) {
      drive.addFile(`f${String(index)}`, folder)
      drive.addComment(drive.addFile(`c${String(index)}`, MY_DRIVE_ROOT), 'x')
    }
    const commented = drive.addFile('Commented', MY_DRIVE_ROOT)
    for (let index = 0; index < 5; index += 1) {
      drive.addComment(commented, `comment ${String(index)}`)
    }
    drive.maxPageSize = 3
    const client = new DriveClient({
      transport: drive.handle,
      sleep: () => undefined,
      readOnly: true,
    })

    expect(client.listChildren(folder)).toHaveLength(7)
    expect(client.listComments(commented)).toHaveLength(5)
    expect(drive.requests).toHaveLength(3 + 2)
  })

  it('marks a reply that resolves the thread', () => {
    const { client, sent } = scripted([])

    client.createReply('file1', 'comment1', 'done', true)
    client.createReply('file1', 'comment1', 'not done', false)

    expect(JSON.parse(sent[0]?.body ?? '{}')).toEqual({
      content: 'done',
      action: 'resolve',
    })
    expect(JSON.parse(sent[1]?.body ?? '{}')).toEqual({ content: 'not done' })
  })

  it('returns who is signed in', () => {
    const drive = new FakeDrive()
    const client = new DriveClient({
      transport: drive.handle,
      sleep: () => undefined,
      readOnly: true,
    })

    expect(client.about().emailAddress).toBe('me@example.com')
  })

  it('reports a missing shared drive as null rather than an error', () => {
    const drive = new FakeDrive()
    const client = new DriveClient({
      transport: drive.handle,
      sleep: () => undefined,
      readOnly: true,
    })

    expect(client.getSharedDrive('nope')).toBeNull()
  })
})

describe('errors and retries', () => {
  it('retries rate limits and server errors, doubling the wait', () => {
    const { client, sleeps, sent } = scripted([
      rateLimited,
      { status: 429, body: '' },
      { status: 503, body: '<html>Service Unavailable</html>' },
      { status: 200, body: '{"id":"f1"}' },
    ])

    expect(client.getFile('f1').id).toBe('f1')
    expect(sent).toHaveLength(4)
    expect(sleeps).toEqual([1500, 2500, 4500])
  })

  it('gives up after six attempts', () => {
    const { client, sent } = scripted(
      Array.from({ length: 10 }, () => rateLimited)
    )

    expect(() => client.getFile('f1')).toThrow(DriveError)
    expect(sent).toHaveLength(6)
  })

  it('does not retry a plain refusal, and reports its reason', () => {
    const { client, sent } = scripted([
      {
        status: 403,
        body: JSON.stringify({
          error: {
            message: 'Not allowed',
            errors: [{ reason: 'fileOwnerNotMemberOfTeamDrive' }],
          },
        }),
      },
    ])

    let caught: unknown
    try {
      client.moveFile('f1', 'a', ['b'])
    } catch (error) {
      caught = error
    }

    expect(sent).toHaveLength(1)
    expect(caught).toBeInstanceOf(DriveError)
    expect((caught as DriveError).status).toBe(403)
    expect((caught as DriveError).reason).toBe('fileOwnerNotMemberOfTeamDrive')
    expect((caught as DriveError).message).toBe(
      'Not allowed [fileOwnerNotMemberOfTeamDrive]'
    )
  })

  it('never resends a write whose outcome is unknown', () => {
    const copy = {
      name: 'n',
      parentId: 'p',
      description: '',
      properties: {},
      copyComments: true,
    }
    for (const status of [500, 503, 0]) {
      const { client, sent, sleeps } = scripted([{ status, body: '' }])

      expect(() => client.copyFile('f1', copy)).toThrow(DriveError)
      expect(() => client.moveFile('f1', 'a', ['b'])).not.toThrow()
      expect(sent).toHaveLength(2)
      expect(sleeps).toEqual([])
    }
  })

  it('does resend a write that Drive turned away for rate limiting', () => {
    const { client, sent } = scripted([{ status: 429, body: '' }, rateLimited])

    client.createComment('f1', 'hello')

    expect(sent).toHaveLength(3)
  })

  it('retries a read that got no response at all', () => {
    const { client, sent } = scripted([
      { status: 0, body: '{"error":{"message":"No response: timeout"}}' },
      { status: 200, body: '{"id":"f1"}' },
    ])

    expect(client.getFile('f1').id).toBe('f1')
    expect(sent).toHaveLength(2)
  })

  it('treats "forbidden" from the shared-drive lookup as "not a shared drive"', () => {
    const { client } = scripted([{ status: 403, body: '{}' }])

    expect(client.getSharedDrive('folder-id')).toBeNull()
  })

  it('copes with an error body that is not JSON', () => {
    const { client } = scripted([{ status: 400, body: 'Bad Request' }])

    expect(() => client.getFile('f1')).toThrow('HTTP 400')
  })

  it('passes on other errors from the shared-drive lookup', () => {
    const { client } = scripted([{ status: 400, body: '{}' }])

    expect(() => client.getSharedDrive('d1')).toThrow(DriveError)
  })
})
