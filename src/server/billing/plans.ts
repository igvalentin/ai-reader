import {
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
  type SubscriptionPlanId,
} from '../../constants/subscriptionPlans.js'

export { SUBSCRIPTION_PLANS, type SubscriptionPlan, type SubscriptionPlanId }

export interface StripePriceDetails {
  readonly active: boolean
  readonly currency: string
  readonly unit_amount: number | null
  readonly recurring: { readonly interval: string; readonly interval_count: number } | null
}

export function findSubscriptionPlan(value: unknown): SubscriptionPlan | null {
  if (typeof value !== 'string') return null
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === value) ?? null
}

export function stripePriceMatchesPlan(price: StripePriceDetails, plan: SubscriptionPlan): boolean {
  return (
    price.active &&
    price.currency.toLowerCase() === 'ron' &&
    price.unit_amount === plan.unitAmount &&
    price.recurring?.interval === plan.interval &&
    price.recurring.interval_count === plan.intervalCount
  )
}
