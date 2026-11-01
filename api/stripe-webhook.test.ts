import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Stripe from 'stripe'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  constructEvent: vi.fn(),
  getStripe: vi.fn(),
  retrieveSubscription: vi.fn(),
  applyStripeSubscriptionEvent: vi.fn(),
  recordBillingEvent: vi.fn(),
  resolveUserIdForCustomer: vi.fn(),
}))

vi.mock('../src/server/billing/billing.js', () => ({
  applyStripeSubscriptionEvent: mocks.applyStripeSubscriptionEvent,
  getStripe: mocks.getStripe,
  recordBillingEvent: mocks.recordBillingEvent,
  resolveUserIdForCustomer: mocks.resolveUserIdForCustomer,
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

function checkoutCompletedEvent(): Stripe.Event {
  return {
    id: 'evt_checkout_123',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_123',
        client_reference_id: 'user-123',
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
        metadata: { app_user_id: 'user-123', plan_id: '7-days' },
      } as unknown as Stripe.Checkout.Session,
    },
  } as Stripe.Event
}

describe('POST /api/stripe-webhook', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'test-webhook-secret'
    mocks.calls.length = 0
    mocks.constructEvent.mockReset().mockReturnValue(subscriptionUpdatedEvent())
    mocks.retrieveSubscription.mockReset().mockResolvedValue(subscriptionUpdatedEvent().data.object)
    mocks.getStripe.mockReset().mockReturnValue({
      webhooks: { constructEvent: mocks.constructEvent },
      subscriptions: { retrieve: mocks.retrieveSubscription },
    })
    mocks.recordBillingEvent.mockReset().mockImplementation(async () => {
      mocks.calls.push('record-event')
      return true
    })
    mocks.resolveUserIdForCustomer.mockReset().mockImplementation(async () => {
      mocks.calls.push('resolve-user')
      return 'user-123'
    })
    mocks.applyStripeSubscriptionEvent.mockReset().mockImplementation(async () => {
      mocks.calls.push('apply-subscription-event')
      return true
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
    expect(mocks.calls).toEqual(['resolve-user', 'apply-subscription-event'])
  })

  it('activates only from a verified Checkout event and the retrieved Stripe subscription', async () => {
    const event = checkoutCompletedEvent()
    mocks.constructEvent.mockReturnValueOnce(event)
    const { req, res } = createMockReqRes()

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(mocks.retrieveSubscription).toHaveBeenCalledWith('sub_test_123')
    expect(mocks.applyStripeSubscriptionEvent).toHaveBeenCalledWith(
      event,
      'user-123',
      subscriptionUpdatedEvent().data.object,
      'cus_test_123',
    )
    expect(mocks.recordBillingEvent).not.toHaveBeenCalled()
  })

  it('acknowledges duplicate subscription events without applying them twice', async () => {
    mocks.applyStripeSubscriptionEvent.mockResolvedValueOnce(false)
    const { req, res } = createMockReqRes()

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.jsonBody).toMatchObject({ received: true, duplicate: true })
  })

  it('rejects an invalid Stripe signature before writing billing state', async () => {
    const signatureError = new Error('invalid signature')
    Object.setPrototypeOf(signatureError, Stripe.errors.StripeSignatureVerificationError.prototype)
    mocks.constructEvent.mockImplementation(() => {
      throw signatureError
    })
    const { req, res } = createMockReqRes()

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(mocks.recordBillingEvent).not.toHaveBeenCalled()
    expect(mocks.applyStripeSubscriptionEvent).not.toHaveBeenCalled()
  })

  it('does not acknowledge an event when its atomic subscription transaction fails', async () => {
    mocks.applyStripeSubscriptionEvent.mockRejectedValue(new Error('database unavailable'))
    const { req, res } = createMockReqRes()

    await handler(req, res)

    expect(res.statusCode).toBe(500)
    expect(mocks.recordBillingEvent).not.toHaveBeenCalled()
  })
})
