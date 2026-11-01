export const SUBSCRIPTION_PLANS = [
  {
    id: '7-days',
    label: '7 zile',
    priceRon: 5,
    unitAmount: 500,
    interval: 'week',
    intervalCount: 1,
    priceEnvironmentVariable: 'STRIPE_PRICE_ID_7_DAYS',
    renewalCopy: 'Se reînnoiește automat la fiecare 7 zile.',
  },
  {
    id: '30-days',
    label: '30 de zile',
    priceRon: 10,
    unitAmount: 1_000,
    interval: 'day',
    intervalCount: 30,
    priceEnvironmentVariable: 'STRIPE_PRICE_ID_30_DAYS',
    renewalCopy: 'Se reînnoiește automat la fiecare 30 de zile.',
  },
  {
    id: '1-year',
    label: '1 an',
    priceRon: 100,
    unitAmount: 10_000,
    interval: 'year',
    intervalCount: 1,
    priceEnvironmentVariable: 'STRIPE_PRICE_ID_1_YEAR',
    renewalCopy: 'Se reînnoiește automat anual.',
  },
] as const

export type SubscriptionPlanId = (typeof SUBSCRIPTION_PLANS)[number]['id']
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number]
