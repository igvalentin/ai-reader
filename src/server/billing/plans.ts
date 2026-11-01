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
  if (!price.active || price.currency.toLowerCase() !== 'ron' || price.unit_amount !== plan.unitAmount) {
    return false
  }
  const recurring = price.recurring
  if (!recurring) return false
  const exactConfiguredInterval =
    recurring.interval === plan.interval && recurring.interval_count === plan.intervalCount
  const exactSevenDayAlternative =
    plan.id === '7-days' && recurring.interval === 'day' && recurring.interval_count === 7
  return exactConfiguredInterval || exactSevenDayAlternative
}
