import { describe, expect, it } from 'vitest'
import { findSubscriptionPlan, stripePriceMatchesPlan, SUBSCRIPTION_PLANS } from './plans'

describe('subscription plans', () => {
  it('defines the three RON recurring plans with the requested durations', () => {
    expect(
      SUBSCRIPTION_PLANS.map(
        ({
          id,
          priceRon,
          interval,
          intervalCount,
          priceEnvironmentVariable,
          productEnvironmentVariable,
        }) => ({
          id,
          priceRon,
          interval,
          intervalCount,
          priceEnvironmentVariable,
          productEnvironmentVariable,
        }),
      ),
    ).toEqual([
      {
        id: '7-days',
        priceRon: 5,
        interval: 'week',
        intervalCount: 1,
        priceEnvironmentVariable: 'STRIPE_PRICE_ID_7_DAYS',
        productEnvironmentVariable: 'STRIPE_PRICE_PLAN_1',
      },
      {
        id: '30-days',
        priceRon: 10,
        interval: 'day',
        intervalCount: 30,
        priceEnvironmentVariable: 'STRIPE_PRICE_ID_30_DAYS',
        productEnvironmentVariable: 'STRIPE_PRICE_PLAN_2',
      },
      {
        id: '1-year',
        priceRon: 100,
        interval: 'year',
        intervalCount: 1,
        priceEnvironmentVariable: 'STRIPE_PRICE_ID_1_YEAR',
        productEnvironmentVariable: 'STRIPE_PRICE_PLAN_3',
      },
    ])
  })

  it('accepts the exact seven-day period whether Stripe represents it as a week or seven days', () => {
    const plan = findSubscriptionPlan('7-days')
    expect(plan).not.toBeNull()
    for (const recurring of [
      { interval: 'week', interval_count: 1 },
      { interval: 'day', interval_count: 7 },
    ]) {
      expect(
        stripePriceMatchesPlan(
          { active: true, currency: 'ron', unit_amount: 500, recurring },
          plan!,
        ),
      ).toBe(true)
    }
    expect(
      stripePriceMatchesPlan(
        { active: true, currency: 'ron', unit_amount: 500, recurring: null },
        plan!,
      ),
    ).toBe(false)
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
