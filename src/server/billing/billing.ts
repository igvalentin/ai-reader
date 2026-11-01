import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import {
  EntitlementError,
  getUserSubscription,
  hasActiveSubscription,
} from '../entitlement/entitlement.js'
import {
  findSubscriptionPlan,
  stripePriceMatchesPlan,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
  type SubscriptionPlanId,
} from './plans.js'

let stripe: Stripe | undefined

export function getStripe(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) throw new EntitlementError('CONFIGURATION', 'Configurarea Stripe lipsește.')
  stripe ??= new Stripe(secret)
  return stripe
}

export async function reconcileCheckoutSession(
  userId: string,
  sessionId: string,
): Promise<boolean> {
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  const isPaid =
    session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
  if (
    session.client_reference_id !== userId ||
    session.mode !== 'subscription' ||
    session.status !== 'complete' ||
    !isPaid ||
    !session.subscription
  ) {
    return false
  }

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription.id
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  if (subscription.status !== 'active' && subscription.status !== 'trialing') return false

  const checkoutEvent = {
    id: `checkout_reconciled_${session.id}`,
    type: 'checkout.session.completed',
    created: session.created,
    data: { object: session },
  } as unknown as Stripe.Event
  return applyStripeSubscriptionEvent(
    checkoutEvent,
    userId,
    subscription,
    typeof session.customer === 'string' ? session.customer : session.customer?.id,
  )
}

function getAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key)
    throw new EntitlementError('CONFIGURATION', 'Configurarea Supabase server-side lipsește.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function getAppUrl(): string {
  const url = process.env.APP_URL
  if (!url) throw new EntitlementError('CONFIGURATION', 'APP_URL nu este configurat.')
  return url.replace(/\/$/, '')
}

function logStripePriceMismatch(planId: SubscriptionPlanId, price: Stripe.Price): void {
  console.error(
    JSON.stringify({
      event: 'stripe_price_configuration_mismatch',
      planId,
      active: price.active,
      currency: price.currency,
      unitAmount: price.unit_amount,
      interval: price.recurring?.interval ?? null,
      intervalCount: price.recurring?.interval_count ?? null,
    }),
  )
}

function expectedStripePriceDescription(plan: SubscriptionPlan): string {
  const interval =
    plan.id === '7-days'
      ? 'săptămânal (week × 1) sau zilnic (day × 7)'
      : `${plan.interval} × ${plan.intervalCount}`
  return `${plan.priceRon} RON (${plan.unitAmount} bani), ${interval}`
}

async function getConfiguredPrice(planId: SubscriptionPlanId) {
  const plan = findSubscriptionPlan(planId)
  if (!plan) throw new EntitlementError('CONFIGURATION', 'Planul selectat nu este disponibil.')
  const stripe = getStripe()
  const configuredPriceId = process.env[plan.priceEnvironmentVariable]?.trim()
  const mismatchMessage = `Price-ul planului ${plan.label} trebuie să fie activ și să corespundă: ${expectedStripePriceDescription(plan)}.`

  if (configuredPriceId) {
    const price = await stripe.prices.retrieve(configuredPriceId)
    if (!stripePriceMatchesPlan(price, plan)) {
      logStripePriceMismatch(plan.id, price)
      throw new EntitlementError('CONFIGURATION', mismatchMessage)
    }
    return { plan, priceId: price.id }
  }

  const productId = process.env[plan.productEnvironmentVariable]?.trim()
  if (!productId) {
    throw new EntitlementError(
      'CONFIGURATION',
      `Configurează ${plan.priceEnvironmentVariable} cu un Price ID sau ${plan.productEnvironmentVariable} cu un Product ID pentru planul ${plan.id}.`,
    )
  }

  const matchingPrices: Stripe.Price[] = []
  let startingAfter: string | undefined
  let hasMore = true
  let activePriceCount = 0
  while (hasMore) {
    const pricePage = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })
    activePriceCount += pricePage.data.length
    matchingPrices.push(...pricePage.data.filter((price) => stripePriceMatchesPlan(price, plan)))
    if (matchingPrices.length > 1 || !pricePage.has_more) break
    const lastPrice = pricePage.data[pricePage.data.length - 1]
    if (!lastPrice) {
      throw new EntitlementError(
        'CONFIGURATION',
        `Nu s-au putut lista prețurile Stripe pentru planul ${plan.id}.`,
      )
    }
    startingAfter = lastPrice.id
    hasMore = pricePage.has_more
  }
  if (matchingPrices.length !== 1) {
    console.error(
      JSON.stringify({
        event: 'stripe_product_price_mismatch',
        planId: plan.id,
        activePriceCount,
        matchingPriceCount: matchingPrices.length,
      }),
    )
    throw new EntitlementError('CONFIGURATION', mismatchMessage)
  }
  return { plan, priceId: matchingPrices[0].id }
}

export async function createCheckoutSession(
  userId: string,
  planId: SubscriptionPlanId,
  requestId: string,
  email?: string,
) {
  const client = getAdmin()
  const { data: existing, error: readError } = await client
    .from('subscriptions')
    .select('provider_customer_id,status,current_period_end')
    .eq('user_id', userId)
    .maybeSingle()
  if (readError) throw new EntitlementError('DATABASE', 'Nu am putut verifica datele de facturare.')
  if (hasActiveSubscription(existing)) {
    throw new EntitlementError(
      'SUBSCRIPTION_ACTIVE',
      'Ai deja un abonament activ. Îl poți administra din portalul de facturare.',
    )
  }
  const { plan, priceId } = await getConfiguredPrice(planId)

  let customerId = existing?.provider_customer_id as string | null | undefined
  if (!customerId) {
    const customer = await getStripe().customers.create(
      { email, metadata: { app_user_id: userId } },
      { idempotencyKey: `ai-reader-customer-${userId}` },
    )
    customerId = customer.id
    const { error: writeError } = await client.from('subscriptions').upsert({
      user_id: userId,
      provider_customer_id: customerId,
      status: 'none',
      updated_at: new Date().toISOString(),
    })
    if (writeError) {
      throw new EntitlementError(
        'DATABASE',
        'Datele clientului de facturare nu au putut fi salvate.',
      )
    }
  }

  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'subscription',
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${getAppUrl()}/?checkout=success&session_id={CHECKOUT_SESSION_ID}#abonament`,
      cancel_url: `${getAppUrl()}/?checkout=cancelled#abonament`,
      metadata: { app_user_id: userId, plan_id: plan.id },
      subscription_data: { metadata: { app_user_id: userId, plan_id: plan.id } },
      allow_promotion_codes: true,
    },
    { idempotencyKey: `ai-reader-checkout-${userId}-${requestId}` },
  )
  if (!session.url)
    throw new EntitlementError('CONFIGURATION', 'Stripe nu a returnat o adresă de plată.')
  return session.url
}

export async function createPortalSession(userId: string) {
  const subscription = await getUserSubscription(userId)
  if (!subscription || typeof subscription.provider_customer_id !== 'string')
    throw new EntitlementError('PAYWALL', 'Nu există un abonament de administrat.')
  const session = await getStripe().billingPortal.sessions.create({
    customer: subscription.provider_customer_id,
    return_url: `${getAppUrl()}/#abonament`,
  })
  return session.url
}

export async function applyStripeSubscriptionEvent(
  event: Stripe.Event,
  userId: string,
  subscription: Stripe.Subscription,
  customerId?: string,
): Promise<boolean> {
  const client = getAdmin()
  const firstItem = subscription.items.data[0]
  const customer =
    customerId ??
    (typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id)
  const rawStatus = subscription.status as string
  const status =
    rawStatus === 'incomplete_expired'
      ? 'canceled'
      : rawStatus === 'paused'
        ? 'past_due'
        : rawStatus
  const metadataPlan = findSubscriptionPlan(subscription.metadata.plan_id)
  const pricePlan = SUBSCRIPTION_PLANS.find(
    (plan) => process.env[plan.priceEnvironmentVariable] === firstItem?.price.id,
  )
  const planId = metadataPlan?.id ?? pricePlan?.id ?? null
  const { data, error } = await client.rpc('apply_stripe_subscription_event', {
    p_event_id: event.id,
    p_event_type: event.type,
    p_event_created: event.created,
    p_user_id: userId,
    p_plan_id: planId,
    p_customer_id: customer,
    p_subscription_id: subscription.id,
    p_status: status,
    p_current_period_start: firstItem?.current_period_start
      ? new Date(firstItem.current_period_start * 1000).toISOString()
      : null,
    p_current_period_end: firstItem?.current_period_end
      ? new Date(firstItem.current_period_end * 1000).toISOString()
      : null,
    p_cancel_at_period_end: subscription.cancel_at_period_end,
  })
  if (error) {
    console.error(
      JSON.stringify({
        event: 'stripe_subscription_persist_failed',
        rpc: 'apply_stripe_subscription_event',
        databaseCode: error.code || 'unknown',
      }),
    )
    throw new EntitlementError('DATABASE', 'Abonamentul nu a putut fi actualizat.')
  }
  return Boolean(data)
}

export async function resolveUserIdForCustomer(customerId: string): Promise<string | null> {
  const client = getAdmin()
  const { data } = await client
    .from('subscriptions')
    .select('user_id')
    .eq('provider_customer_id', customerId)
    .maybeSingle()
  if (data?.user_id) return data.user_id as string
  const customer = (await getStripe().customers.retrieve(customerId)) as unknown as
    Stripe.Customer | Stripe.DeletedCustomer
  if (customer.deleted || !('metadata' in customer)) return null
  if (typeof customer.metadata.app_user_id === 'string') return customer.metadata.app_user_id
  return null
}

export async function recordBillingEvent(event: Stripe.Event): Promise<boolean> {
  const client = getAdmin()
  const { error } = await client
    .from('billing_events')
    .insert({ provider_event_id: event.id, event_type: event.type })
  if (!error) return true
  if (error.code === '23505') return false
  throw new EntitlementError('DATABASE', 'Evenimentul de facturare nu a putut fi salvat.')
}
