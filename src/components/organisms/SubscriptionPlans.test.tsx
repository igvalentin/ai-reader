import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  requestBillingPortal: vi.fn(),
  requestCheckout: vi.fn(),
  requestSubscriptionStatus: vi.fn(),
}))

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  },
}))

vi.mock('../../lib/billing/billingClient', () => ({
  BillingRequestError: class BillingRequestError extends Error {},
  requestBillingPortal: mocks.requestBillingPortal,
  requestCheckout: mocks.requestCheckout,
  requestSubscriptionStatus: mocks.requestSubscriptionStatus,
}))

import { SubscriptionPlans } from './SubscriptionPlans'

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
})

beforeEach(() => {
  mocks.getSession.mockReset().mockReturnValue(new Promise(() => undefined))
  mocks.onAuthStateChange.mockReset().mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  })
  mocks.requestBillingPortal.mockReset()
  mocks.requestCheckout.mockReset()
  mocks.requestSubscriptionStatus.mockReset().mockResolvedValue(null)
})

describe('SubscriptionPlans', () => {
  it('shows all three RON plans with explicit renewal terms and requires authentication', () => {
    render(<SubscriptionPlans />)

    expect(screen.getByRole('heading', { name: '7 zile' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '30 de zile' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '1 an' })).toBeInTheDocument()
    expect(screen.getByText('5 lei')).toBeInTheDocument()
    expect(screen.getByText('10 lei')).toBeInTheDocument()
    expect(screen.getByText('100 lei')).toBeInTheDocument()
    expect(screen.getByText('Se reînnoiește automat la fiecare 30 de zile.')).toBeInTheDocument()
    expect(
      screen
        .getAllByRole('button', { name: 'Alege planul' })
        .every((button) => button.hasAttribute('disabled')),
    ).toBe(true)
  })

  it('reconciles the returned Checkout session before polling for webhook confirmation', async () => {
    const expiry = '2026-12-01T12:00:00.000Z'
    window.history.replaceState({}, '', '/?checkout=success&session_id=cs_test_checkout123456')
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } })
    mocks.requestSubscriptionStatus.mockResolvedValueOnce(null).mockResolvedValueOnce({
      active: true,
      status: 'active',
      planId: '30-days',
      currentPeriodStart: '2026-11-01T12:00:00.000Z',
      currentPeriodEnd: expiry,
      cancelAtPeriodEnd: false,
      hasBillingAccount: true,
    })
    render(<SubscriptionPlans />)

    expect(await screen.findByText('1 decembrie 2026', {}, { timeout: 5_000 })).toBeInTheDocument()
    expect(screen.getAllByText('30 de zile')).toHaveLength(2)
    expect(screen.getByText(/Reînnoire automată activă/)).toBeInTheDocument()
    expect(mocks.requestSubscriptionStatus).toHaveBeenCalledTimes(2)
    expect(mocks.requestSubscriptionStatus).toHaveBeenNthCalledWith(
      1,
      'test-token',
      'cs_test_checkout123456',
    )
    expect(mocks.requestSubscriptionStatus).toHaveBeenNthCalledWith(2, 'test-token')
    expect(screen.queryByText(/Plata este în curs de confirmare/)).not.toBeInTheDocument()
    expect(
      screen
        .getAllByRole('button', { name: 'Alege planul' })
        .every((button) => button.hasAttribute('disabled')),
    ).toBe(true)
  })
})
