import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mocks = vi.hoisted(() => ({
  verifySupabaseUser: vi.fn(),
  getUserSubscription: vi.fn(),
  hasActiveSubscription: vi.fn(),
  reconcileCheckoutSession: vi.fn(),
}))

vi.mock('../auth/verifySupabaseUser.js', () => ({
  AuthConfigurationError: class AuthConfigurationError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {},
  verifySupabaseUser: mocks.verifySupabaseUser,
}))

vi.mock('../entitlement/entitlement.js', () => ({
  EntitlementError: class EntitlementError extends Error {
    constructor(
      public readonly code: string,
      message: string,
    ) {
      super(message)
    }
  },
  getUserSubscription: mocks.getUserSubscription,
  hasActiveSubscription: mocks.hasActiveSubscription,
}))

vi.mock('../billing/billing.js', () => ({ reconcileCheckoutSession: mocks.reconcileCheckoutSession }))

import handler from '../../../api/subscription'

function createMockReqRes(sessionId?: string) {
  const req = {
    method: 'GET',
    headers: { authorization: 'Bearer verified-token' },
    query: sessionId === undefined ? {} : { session_id: sessionId },
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
    json(value: unknown) {
      this.jsonBody = value
      return this
    },
  }
  return { req, res: res as unknown as VercelResponse & typeof res }
}

describe('GET /api/subscription', () => {
  beforeEach(() => {
    mocks.verifySupabaseUser.mockReset().mockResolvedValue('user-123')
    mocks.reconcileCheckoutSession.mockReset().mockResolvedValue(true)
    mocks.getUserSubscription.mockReset().mockResolvedValue({
      status: 'active',
      plan_id: '7-days',
      current_period_start: '2026-11-01T00:00:00.000Z',
      current_period_end: '2099-11-08T00:00:00.000Z',
      cancel_at_period_end: false,
      provider_customer_id: 'cus_test_123',
    })
    mocks.hasActiveSubscription.mockReset().mockReturnValue(true)
  })

  it('reconciles the authenticated checkout session before returning the stored subscription', async () => {
    const sessionId = 'cs_test_checkout123456'
    const { req, res } = createMockReqRes(sessionId)

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(mocks.verifySupabaseUser).toHaveBeenCalledWith('Bearer verified-token')
    expect(mocks.reconcileCheckoutSession).toHaveBeenCalledWith('user-123', sessionId)
    expect(mocks.getUserSubscription).toHaveBeenCalledWith('user-123')
    expect(res.jsonBody).toMatchObject({
      subscription: { active: true, status: 'active', planId: '7-days' },
    })
  })

  it('rejects malformed checkout session IDs before making external calls', async () => {
    const { req, res } = createMockReqRes('not-a-checkout-session')

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res.jsonBody).toMatchObject({ code: 'INVALID_CHECKOUT_SESSION' })
    expect(mocks.verifySupabaseUser).not.toHaveBeenCalled()
    expect(mocks.reconcileCheckoutSession).not.toHaveBeenCalled()
  })
})
