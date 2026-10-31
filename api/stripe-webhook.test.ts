import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Stripe from 'stripe'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  constructEvent: vi.fn(),
  getStripe: vi.fn(),
  recordBillingEvent: vi.fn(),
  resolveUserIdForCustomer: vi.fn(),
  upsertSubscription: vi.fn(),
}))

vi.mock('../src/server/billing/billing.js', () => ({
  getStripe: mocks.getStripe,
  recordBillingEvent: mocks.recordBillingEvent,
  resolveUserIdForCustomer: mocks.resolveUserIdForCustomer,
  upsertSubscription: mocks.upsertSubscription,
}))

import handler from './stripe-webhook'

function createMockReqRes() {
  const req = {
    method: 'POST',
    headers: { 'stripe-signature': 'test-signature' },
    body: Buffer.from('verified-event-body'),
  } as unknown as VercelRequest

  const res = {
    statusCode: 200,
    jsonBody: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    setHeader() {
      return this
    },
    json(value: unknown) {
      this.jsonBody = value
      return this
    },
  }

  return { req, res: res as unknown as VercelResponse & typeof res }
}

function subscriptionUpdatedEvent(): Stripe.Event {
  return {
    id: 'evt_test_123',
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_test_123',
        customer: 'cus_test_123',
        status: 'active',
        cancel_at_period_end: false,
        items: { data: [{ current_period_end: 1_800_000_000 }] },
      } as unknown as Stripe.Subscription,
    },
  } as Stripe.Event
}

describe('POST /api/stripe-webhook', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'test-webhook-secret'
    mocks.calls.length = 0
    mocks.constructEvent.mockReset().mockReturnValue(subscriptionUpdatedEvent())
    mocks.getStripe.mockReset().mockReturnValue({
      webhooks: { constructEvent: mocks.constructEvent },
      subscriptions: { retrieve: vi.fn() },
    })
    mocks.recordBillingEvent.mockReset().mockImplementation(async () => {
      mocks.calls.push('record-event')
      return true
    })
    mocks.resolveUserIdForCustomer.mockReset().mockImplementation(async () => {
      mocks.calls.push('resolve-user')
      return 'user-123'
    })
    mocks.upsertSubscription.mockReset().mockImplementation(async () => {
      mocks.calls.push('upsert-subscription')
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    vi.restoreAllMocks()
  })

  it('records an event only after its subscription update succeeds', async () => {
    const { req, res } = createMockReqRes()

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(mocks.constructEvent).toHaveBeenCalledWith(
      Buffer.from('verified-event-body'),
      'test-signature',
      'test-webhook-secret',
    )
    expect(mocks.calls).toEqual(['resolve-user', 'upsert-subscription', 'record-event'])
  })

  it('rejects an invalid Stripe signature before writing billing state', async () => {
    const signatureError = new Error('invalid signature')
    Object.setPrototypeOf(signatureError, Stripe.errors.StripeSignatureVerificationError.prototype)
    mocks.constructEvent.mockImplementation(() => { throw signatureError })
    const { req, res } = createMockReqRes()

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(mocks.recordBillingEvent).not.toHaveBeenCalled()
    expect(mocks.upsertSubscription).not.toHaveBeenCalled()
  })

  it('does not mark an event processed when the database update fails, allowing Stripe to retry', async () => {
    mocks.upsertSubscription.mockRejectedValue(new Error('database unavailable'))
    const { req, res } = createMockReqRes()

    await handler(req, res)

    expect(res.statusCode).toBe(500)
    expect(mocks.recordBillingEvent).not.toHaveBeenCalled()
  })
})
