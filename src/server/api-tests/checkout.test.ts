import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mocks = vi.hoisted(() => ({
  verifySupabaseUser: vi.fn(),
  associateAnonymousUsage: vi.fn(),
  createCheckoutSession: vi.fn(),
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
  associateAnonymousUsage: mocks.associateAnonymousUsage,
}))

vi.mock('../billing/billing.js', () => ({
  createCheckoutSession: mocks.createCheckoutSession,
}))

import handler from '../../../api/checkout'
import { UnauthorizedError } from '../auth/verifySupabaseUser.js'
import { EntitlementError } from '../entitlement/entitlement.js'

function createMockReqRes(body: unknown, method = 'POST') {
  const req = {
    method,
    headers: { authorization: 'Bearer verified-token', cookie: 'ai_reader_anon=signed-id' },
    body,
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

describe('POST /api/checkout', () => {
  beforeEach(() => {
    mocks.verifySupabaseUser.mockReset().mockResolvedValue('user-123')
    mocks.associateAnonymousUsage.mockReset().mockResolvedValue(undefined)
    mocks.createCheckoutSession
      .mockReset()
      .mockResolvedValue('https://checkout.stripe.test/session')
  })

  it('rejects unknown plans and malformed idempotency keys before calling Stripe', async () => {
    const invalidPlan = createMockReqRes({ planId: 'custom', requestId: 'not-a-uuid' })
    await handler(invalidPlan.req, invalidPlan.res)
    expect(invalidPlan.res.statusCode).toBe(400)
    expect(mocks.verifySupabaseUser).not.toHaveBeenCalled()
    expect(mocks.createCheckoutSession).not.toHaveBeenCalled()

    const invalidRequestId = createMockReqRes({ planId: '7-days', requestId: 'retry' })
    await handler(invalidRequestId.req, invalidRequestId.res)
    expect(invalidRequestId.res.statusCode).toBe(400)
    expect(mocks.createCheckoutSession).not.toHaveBeenCalled()
  })

  it('creates checkout only for the verified user and requested server-known plan', async () => {
    const requestId = '9f342980-a526-4e44-9b4d-685bd88973b1'
    const { req, res } = createMockReqRes({ planId: '30-days', requestId })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.jsonBody).toEqual({ url: 'https://checkout.stripe.test/session' })
    expect(mocks.associateAnonymousUsage).toHaveBeenCalledWith(
      'user-123',
      'ai_reader_anon=signed-id',
    )
    expect(mocks.createCheckoutSession).toHaveBeenCalledWith('user-123', '30-days', requestId)
  })

  it('returns authentication and already-subscribed states distinctly', async () => {
    mocks.verifySupabaseUser.mockRejectedValueOnce(new UnauthorizedError())
    const unauthenticated = createMockReqRes({
      planId: '7-days',
      requestId: '9f342980-a526-4e44-9b4d-685bd88973b1',
    })
    await handler(unauthenticated.req, unauthenticated.res)
    expect(unauthenticated.res.statusCode).toBe(401)
    expect(unauthenticated.res.jsonBody).toMatchObject({ code: 'AUTHENTICATION_REQUIRED' })

    mocks.createCheckoutSession.mockRejectedValueOnce(
      new EntitlementError('SUBSCRIPTION_ACTIVE', 'Există deja un abonament activ.'),
    )
    const active = createMockReqRes({
      planId: '7-days',
      requestId: '9f342980-a526-4e44-9b4d-685bd88973b1',
    })
    await handler(active.req, active.res)
    expect(active.res.statusCode).toBe(409)
    expect(active.res.jsonBody).toMatchObject({ code: 'SUBSCRIPTION_ACTIVE' })
  })
})
