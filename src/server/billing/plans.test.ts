import { describe, expect, it } from 'vitest'
import { findSubscriptionPlan, stripePriceMatchesPlan, SUBSCRIPTION_PLANS } from './plans'

describe('subscription plans', () => {
  it('defines the three RON recurring plans with the requested durations', () => {
    expect(
      SUBSCRIPTION_PLANS.map(({ id, priceRon, interval, intervalCount }) => ({
        id,
        priceRon,
        interval,
        intervalCount,
      })),
    ).toEqual([
      { id: '7-days', priceRon: 5, interval: 'week', intervalCount: 1 },
      { id: '30-days', priceRon: 10, interval: 'day', intervalCount: 30 },
      { id: '1-year', priceRon: 100, interval: 'year', intervalCount: 1 },
    ])
  })

  it('rejects unknown plan identifiers and Stripe prices with mismatched amount or period', () => {
    const plan = findSubscriptionPlan('30-days')
    expect(findSubscriptionPlan('custom')).toBeNull()
    expect(plan).not.toBeNull()
    expect(
      stripePriceMatchesPlan(
        {
          active: true,
          currency: 'ron',
          unit_amount: 1_000,
          recurring: { interval: 'day', interval_count: 30 },
        },
        plan!,
      ),
    ).toBe(true)
    expect(
      stripePriceMatchesPlan(
        {
          active: true,
          currency: 'ron',
          unit_amount: 1_000,
          recurring: { interval: 'month', interval_count: 1 },
        },
        plan!,
      ),
    ).toBe(false)
    expect(
      stripePriceMatchesPlan(
        {
          active: true,
          currency: 'ron',
          unit_amount: 500,
          recurring: { interval: 'day', interval_count: 30 },
        },
        plan!,
      ),
    ).toBe(false)
  })
})
