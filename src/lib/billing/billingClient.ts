import type { SubscriptionPlanId } from '../../constants/subscriptionPlans'

export type { SubscriptionPlanId }

export interface SubscriptionStatus {
  readonly active: boolean
  readonly status: string
  readonly planId: SubscriptionPlanId | null
  readonly currentPeriodStart: string | null
  readonly currentPeriodEnd: string | null
  readonly cancelAtPeriodEnd: boolean
  readonly hasBillingAccount: boolean
}

export class BillingRequestError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'BillingRequestError'
  }
}

async function requestJson<T>(
  endpoint: string,
  token: string,
  method: 'GET' | 'POST',
  body?: unknown,
): Promise<T> {
  const response = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const payload = (await response.json().catch(() => null)) as
    (T & { code?: string; error?: string }) | null
  if (!response.ok) {
    throw new BillingRequestError(
      payload?.error ?? 'Solicitarea de abonament nu a putut fi finalizată.',
      payload?.code,
      response.status,
    )
  }
  if (!payload) throw new BillingRequestError('Răspuns invalid de la server.', 'INVALID_RESPONSE')
  return payload
}

export async function requestCheckout(
  planId: SubscriptionPlanId,
  requestId: string,
  token: string,
): Promise<string> {
  const payload = await requestJson<{ url?: string }>('/api/checkout', token, 'POST', {
    planId,
    requestId,
  })
  if (!payload.url) throw new BillingRequestError('Checkout-ul nu a returnat o adresă validă.')
  return payload.url
}

export async function requestBillingPortal(token: string): Promise<string> {
  const payload = await requestJson<{ url?: string }>('/api/portal', token, 'POST')
  if (!payload.url)
    throw new BillingRequestError('Portalul de facturare nu a returnat o adresă validă.')
  return payload.url
}

export async function requestSubscriptionStatus(
  token: string,
  checkoutSessionId?: string,
): Promise<SubscriptionStatus | null> {
  const payload = await requestJson<{ subscription: SubscriptionStatus | null }>(
    checkoutSessionId
      ? '/api/subscription?session_id=' + encodeURIComponent(checkoutSessionId)
      : '/api/subscription',
    token,
    'GET',
  )
  return payload.subscription
}
