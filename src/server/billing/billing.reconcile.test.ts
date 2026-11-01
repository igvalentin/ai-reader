import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  retrieveCheckoutSession: vi.fn(),
  retrieveSubscription: vi.fn(),
  rpc: vi.fn(),
  stripeClient: {
    checkout: { sessions: { retrieve: vi.fn() } },
    subscriptions: { retrieve: vi.fn() },
  },
  supabaseClient: { rpc: vi.fn() },
  createClient: vi.fn(),
}))

vi.mock('stripe', () => ({
  default: class StripeMock {
    constructor() {
      return mocks.stripeClient
    }
  },
}))

vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }))

import { reconcileCheckoutSession } from './billing'

const paidCheckoutSession = {
  id: 'cs_test_checkout123456',
  client_reference_id: 'user-123',
  mode: 'subscription',
  status: 'complete',
  payment_status: 'paid',
  subscription: 'sub_test_123',
  customer: 'cus_test_123',
  created: 1_800_000_000,
}

const activeSubscription = {
  id: 'sub_test_123',
  customer: 'cus_test_123',
  status: 'active',
  metadata: { plan_id: '7-days' },
  cancel_at_period_end: false,
  items: {
    data: [
      {
        current_period_start: 1_800_000_000,
        current_period_end: 1_800_604_800,
        price: { id: 'price_7_days' },
      },
    ],
  },
}

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
  process.env.SUPABASE_URL = 'https://supabase.test'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test'
  mocks.stripeClient.checkout.sessions.retrieve = mocks.retrieveCheckoutSession
  mocks.stripeClient.subscriptions.retrieve = mocks.retrieveSubscription
  mocks.supabaseClient.rpc = mocks.rpc
  mocks.createClient.mockReset().mockReturnValue(mocks.supabaseClient)
  mocks.retrieveCheckoutSession.mockReset().mockResolvedValue(paidCheckoutSession)
  mocks.retrieveSubscription.mockReset().mockResolvedValue(activeSubscription)
  mocks.rpc.mockReset().mockResolvedValue({ data: true, error: null })
})

afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY
  delete process.env.SUPABASE_URL
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  vi.restoreAllMocks()
})

describe('reconcileCheckoutSession', () => {
  it('persists an active subscription only after Stripe verifies the paid session belongs to the user', async () => {
    await expect(reconcileCheckoutSession('user-123', paidCheckoutSession.id)).resolves.toBe(true)

    expect(mocks.retrieveCheckoutSession).toHaveBeenCalledWith(paidCheckoutSession.id)
    expect(mocks.retrieveSubscription).toHaveBeenCalledWith('sub_test_123')
    expect(mocks.rpc).toHaveBeenCalledWith(
      'apply_stripe_subscription_event',
      expect.objectContaining({
        p_event_id: `checkout_reconciled_${paidCheckoutSession.id}`,
        p_event_type: 'checkout.session.completed',
        p_user_id: 'user-123',
        p_plan_id: '7-days',
        p_customer_id: 'cus_test_123',
        p_subscription_id: 'sub_test_123',
        p_status: 'active',
      }),
    )

    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST202', message: 'private database error' },
    })
    await expect(
      reconcileCheckoutSession('user-123', paidCheckoutSession.id),
    ).rejects.toMatchObject({ code: 'DATABASE' })
    expect(errorLog).toHaveBeenCalledWith(expect.stringContaining('PGRST202'))
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('private database error')
  })

  it('does not persist incomplete, unpaid, or another user’s Checkout session', async () => {
    mocks.retrieveCheckoutSession
      .mockResolvedValueOnce({ ...paidCheckoutSession, payment_status: 'unpaid' })
      .mockResolvedValueOnce({ ...paidCheckoutSession, client_reference_id: 'other-user' })

    await expect(reconcileCheckoutSession('user-123', paidCheckoutSession.id)).resolves.toBe(false)
    await expect(reconcileCheckoutSession('user-123', paidCheckoutSession.id)).resolves.toBe(false)

    expect(mocks.retrieveSubscription).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
