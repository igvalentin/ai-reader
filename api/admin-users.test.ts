import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mocks = vi.hoisted(() => ({
  verifySupabaseUser: vi.fn(),
  getAdminUsers: vi.fn(),
}))

vi.mock('../src/server/auth/verifySupabaseUser.js', () => ({
  AuthConfigurationError: class AuthConfigurationError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {},
  verifySupabaseUser: mocks.verifySupabaseUser,
}))

vi.mock('../src/server/admin/adminUsers.js', () => ({
  getAdminUsers: mocks.getAdminUsers,
}))

import handler from './admin/users'
import { UnauthorizedError } from '../src/server/auth/verifySupabaseUser.js'

function createMockReqRes(query: Record<string, string> = {}) {
  const req = {
    method: 'GET',
    headers: { authorization: 'Bearer test-token' },
    query,
  } as unknown as VercelRequest
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    jsonBody: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value
      return this
    },
    json(body: unknown) {
      this.jsonBody = body
      return this
    },
  }
  return { req, res: res as unknown as VercelResponse & typeof res }
}

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    process.env.ADMIN_USER_IDS = 'trusted-admin-id'
    mocks.verifySupabaseUser.mockReset().mockResolvedValue('trusted-admin-id')
    mocks.getAdminUsers
      .mockReset()
      .mockResolvedValue({ rows: [], total: 0, page: 1, pageSize: 50, summary: {} })
  })

  afterEach(() => {
    delete process.env.ADMIN_USER_IDS
  })

  it('denies a verified non-admin before querying user data', async () => {
    mocks.verifySupabaseUser.mockResolvedValueOnce('ordinary-user-id')
    const { req, res } = createMockReqRes()

    await handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(res.jsonBody).toMatchObject({ code: 'ADMIN_REQUIRED' })
    expect(mocks.getAdminUsers).not.toHaveBeenCalled()
  })

  it('requires a valid session and supports a data-free admin authorization check', async () => {
    mocks.verifySupabaseUser.mockRejectedValueOnce(new UnauthorizedError())
    const unauthenticated = createMockReqRes()
    await handler(unauthenticated.req, unauthenticated.res)
    expect(unauthenticated.res.statusCode).toBe(401)

    const check = createMockReqRes({ check: '1' })
    await handler(check.req, check.res)
    expect(check.res.statusCode).toBe(200)
    expect(check.res.jsonBody).toEqual({ authorized: true })
    expect(mocks.getAdminUsers).not.toHaveBeenCalled()
  })

  it('passes bounded filters and pagination to the server-side repository', async () => {
    const { req, res } = createMockReqRes({
      category: 'subscribers',
      search: 'reader@example.com',
      page: '2',
      pageSize: '5000',
    })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(mocks.getAdminUsers).toHaveBeenCalledWith('reader@example.com', 'subscribers', 2, 100)
  })
})
