import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const subscriptionQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    upsert: vi.fn(),
  }
  const stripeClient = {
    prices: { retrieve: vi.fn(), list: vi.fn() },
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
  }
  const supabaseClient = { from: vi.fn(() => subscriptionQuery) }
  return { stripeClient, subscriptionQuery, supabaseClient, createClient: vi.fn() }
})

vi.mock('stripe', () => ({
  default: class StripeMock {
    constructor() {
      return mocks.stripeClient
    }
  },
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))

import { createCheckoutSession } from './billing'
import { EntitlementError } from '../entitlement/entitlement'

afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY
  delete process.env.SUPABASE_URL
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  delete process.env.APP_URL
  delete process.env.STRIPE_PRICE_ID_7_DAYS
  delete process.env.STRIPE_PRICE_ID_30_DAYS
  delete process.env.STRIPE_PRICE_ID_1_YEAR
  delete process.env.STRIPE_PRICE_PLAN_1
  delete process.env.STRIPE_PRICE_PLAN_2
  delete process.env.STRIPE_PRICE_PLAN_3
  vi.restoreAllMocks()
})

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = 'test-secret'
  process.env.SUPABASE_URL = 'https://supabase.test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  process.env.APP_URL = 'https://reader.example'
  process.env.STRIPE_PRICE_ID_7_DAYS = 'price_week'
  process.env.STRIPE_PRICE_ID_30_DAYS = 'price_30days'
  process.env.STRIPE_PRICE_ID_1_YEAR = 'price_year'
  mocks.createClient.mockReset().mockReturnValue(mocks.supabaseClient)
  mocks.supabaseClient.from.mockClear()
  mocks.subscriptionQuery.select.mockClear()
  mocks.subscriptionQuery.eq.mockClear()
  mocks.subscriptionQuery.maybeSingle.mockReset().mockResolvedValue({ data: null, error: null })
  mocks.subscriptionQuery.upsert.mockReset().mockResolvedValue({ error: null })
  mocks.stripeClient.prices.retrieve.mockReset().mockResolvedValue({
    id: 'price_30days',
    active: true,
    currency: 'ron',
    unit_amount: 1_000,
    recurring: { interval: 'day', interval_count: 30 },
  })
  mocks.stripeClient.prices.list.mockReset().mockResolvedValue({ data: [] })
  mocks.stripeClient.customers.create.mockReset().mockResolvedValue({ id: 'cus_test' })
  mocks.stripeClient.checkout.sessions.create.mockReset().mockResolvedValue({
    url: 'https://checkout.stripe.test/session',
  })
})

describe('createCheckoutSession', () => {
  it('uses only the server-configured recurring Price and an idempotency key', async () => {
    const url = await createCheckoutSession(
      'user-123',
      '30-days',
      '9f342980-a526-4e44-9b4d-685bd88973b1',
    )

    expect(url).toBe('https://checkout.stripe.test/session')
    expect(mocks.stripeClient.prices.retrieve).toHaveBeenCalledWith('price_30days')
    expect(mocks.stripeClient.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{ price: 'price_30days', quantity: 1 }],
        metadata: { app_user_id: 'user-123', plan_id: '30-days' },
        subscription_data: { metadata: { app_user_id: 'user-123', plan_id: '30-days' } },
      }),
      { idempotencyKey: 'ai-reader-checkout-user-123-9f342980-a526-4e44-9b4d-685bd88973b1' },
    )
  })

  it('resolves configured Stripe Product IDs to the matching active Price', async () => {
    delete process.env.STRIPE_PRICE_ID_7_DAYS
    process.env.STRIPE_PRICE_PLAN_1 = 'prod_weekly'
    mocks.stripeClient.prices.list.mockResolvedValueOnce({
      data: [
        {
          id: 'price_weekly',
          active: true,
          currency: 'ron',
          unit_amount: 500,
          recurring: { interval: 'week', interval_count: 1 },
        },
      ],
    })

    const url = await createCheckoutSession(
      'user-123',
      '7-days',
      '9f342980-a526-4e44-9b4d-685bd88973b1',
    )

    expect(url).toBe('https://checkout.stripe.test/session')
    expect(mocks.stripeClient.prices.list).toHaveBeenCalledWith({
      product: 'prod_weekly',
      active: true,
      limit: 100,
    })
    expect(mocks.stripeClient.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ line_items: [{ price: 'price_weekly', quantity: 1 }] }),
      expect.objectContaining({
        idempotencyKey: expect.stringContaining('9f342980-a526-4e44-9b4d-685bd88973b1'),
      }),
    )
  })

  it('rejects an ambiguous product with multiple matching active Prices across pages', async () => {
    delete process.env.STRIPE_PRICE_ID_7_DAYS
    process.env.STRIPE_PRICE_PLAN_1 = 'prod_weekly'
    const matchingPrice = {
      active: true,
      currency: 'ron',
      unit_amount: 500,
      recurring: { interval: 'week', interval_count: 1 },
    }
    mocks.stripeClient.prices.list
      .mockResolvedValueOnce({
        data: [{ ...matchingPrice, id: 'price_weekly_1' }],
        has_more: true,
      })
      .mockResolvedValueOnce({
        data: [{ ...matchingPrice, id: 'price_weekly_2' }],
        has_more: false,
      })

    await expect(
      createCheckoutSession('user-123', '7-days', '9f342980-a526-4e44-9b4d-685bd88973b1'),
    ).rejects.toMatchObject({ code: 'CONFIGURATION' })
    expect(mocks.stripeClient.prices.list).toHaveBeenCalledTimes(2)
    expect(mocks.stripeClient.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it('refuses a Stripe price whose amount or duration differs from the plan', async () => {
    mocks.stripeClient.prices.retrieve.mockResolvedValueOnce({
      active: true,
      currency: 'ron',
      unit_amount: 1_000,
      recurring: { interval: 'month', interval_count: 1 },
    })

    await expect(
      createCheckoutSession('user-123', '30-days', '9f342980-a526-4e44-9b4d-685bd88973b1'),
    ).rejects.toMatchObject({ code: 'CONFIGURATION' })
    expect(mocks.stripeClient.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it('does not create another checkout for an active unexpired subscription', async () => {
    mocks.subscriptionQuery.maybeSingle.mockResolvedValueOnce({
      data: {
        provider_customer_id: 'cus_existing',
        status: 'active',
        current_period_end: new Date(Date.now() + 86400000).toISOString(),
      },
      error: null,
    })

    await expect(
      createCheckoutSession('user-123', '7-days', '9f342980-a526-4e44-9b4d-685bd88973b1'),
    ).rejects.toBeInstanceOf(EntitlementError)
    expect(mocks.stripeClient.prices.retrieve).not.toHaveBeenCalled()
    expect(mocks.stripeClient.checkout.sessions.create).not.toHaveBeenCalled()
  })
})
