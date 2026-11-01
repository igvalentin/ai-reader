import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  deleteRows: vi.fn(),
  lt: vi.fn(),
}))

vi.mock('../../entitlement/entitlement.js', () => ({
  getSupabaseAdmin: () => ({ from: mocks.from }),
}))

import handler from '../../../../api/cron/usage-retention'

function createMockReqRes(method = 'GET', authorization?: string) {
  const req = { method, headers: { authorization } } as unknown as VercelRequest
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

describe('GET /api/cron/usage-retention', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret'
    mocks.from.mockReset().mockImplementation(() => ({ delete: mocks.deleteRows }))
    mocks.deleteRows.mockReset().mockReturnValue({ lt: mocks.lt })
    mocks.lt.mockReset().mockResolvedValue({ error: null, count: 2 })
  })

  afterEach(() => {
    delete process.env.CRON_SECRET
  })

  it('rejects requests without the server cron secret', async () => {
    const { req, res } = createMockReqRes()

    await handler(req, res)

    expect(res.statusCode).toBe(401)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('deletes only records older than the retention cutoff using the service client', async () => {
    const { req, res } = createMockReqRes('GET', 'Bearer test-cron-secret')

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(mocks.from).toHaveBeenCalledWith('usage_metrics')
    expect(mocks.from).toHaveBeenCalledWith('anonymous_reading_usage')
    expect(mocks.deleteRows).toHaveBeenCalledWith({ count: 'exact' })
    expect(mocks.lt).toHaveBeenCalledTimes(2)
    expect(res.jsonBody).toMatchObject({ retentionDays: 365 })
  })
})
