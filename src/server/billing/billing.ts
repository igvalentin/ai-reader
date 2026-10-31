import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { EntitlementError, getUserSubscription } from '../entitlement/entitlement.js'

let stripe: Stripe | undefined

export function getStripe(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) throw new EntitlementError('CONFIGURATION', 'Configurarea Stripe lipsește.')
  stripe ??= new Stripe(secret)
  return stripe
}

function getAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new EntitlementError('CONFIGURATION', 'Configurarea Supabase server-side lipsește.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function getAppUrl(): string {
  const url = process.env.APP_URL
  if (!url) throw new EntitlementError('CONFIGURATION', 'APP_URL nu este configurat.')
  return url.replace(/\/$/, '')
}

export function getConfiguredPriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID
  if (!priceId) throw new EntitlementError('CONFIGURATION', 'STRIPE_PRICE_ID nu este configurat.')
  return priceId
}

export async function createCheckoutSession(userId: string, email?: string) {
  const client = getAdmin()
  const { data: existing } = await client.from('subscriptions').select('provider_customer_id').eq('user_id', userId).maybeSingle()
  let customerId = existing?.provider_customer_id as string | null | undefined
  if (!customerId) {
    const customer = await getStripe().customers.create({ email, metadata: { app_user_id: userId } })
    customerId = customer.id
    await client.from('subscriptions').upsert({ user_id: userId, provider_customer_id: customerId, status: 'none', updated_at: new Date().toISOString() })
  }
  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price: getConfiguredPriceId(), quantity: 1 }],
    success_url: `${getAppUrl()}/?checkout=success`,
    cancel_url: `${getAppUrl()}/?checkout=cancelled#abonament`,
    subscription_data: { metadata: { app_user_id: userId } },
    allow_promotion_codes: true,
  })
  if (!session.url) throw new EntitlementError('CONFIGURATION', 'Stripe nu a returnat o adresă de plată.')
  return session.url
}

export async function createPortalSession(userId: string) {
  const subscription = await getUserSubscription(userId)
  if (!subscription || typeof subscription.provider_customer_id !== 'string') throw new EntitlementError('PAYWALL', 'Nu există un abonament de administrat.')
  const session = await getStripe().billingPortal.sessions.create({ customer: subscription.provider_customer_id, return_url: `${getAppUrl()}/#abonament` })
  return session.url
}

export async function upsertSubscription(userId: string, subscription: Stripe.Subscription, customerId?: string) {
  const client = getAdmin()
  await client.from('subscriptions').upsert({
    user_id: userId,
    status: subscription.status,
    provider_customer_id: customerId ?? (typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id),
    provider_subscription_id: subscription.id,
    current_period_end: new Date(subscription.items.data[0]?.current_period_end ? subscription.items.data[0].current_period_end * 1000 : Date.now()).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  })
}

export async function resolveUserIdForCustomer(customerId: string): Promise<string | null> {
  const client = getAdmin()
  const { data } = await client.from('subscriptions').select('user_id').eq('provider_customer_id', customerId).maybeSingle()
  if (data?.user_id) return data.user_id as string
  const customer = await getStripe().customers.retrieve(customerId) as unknown as Stripe.Customer | Stripe.DeletedCustomer
  if (customer.deleted || !('metadata' in customer)) return null
  if (typeof customer.metadata.app_user_id === 'string') return customer.metadata.app_user_id
  return null
}

export async function recordBillingEvent(event: Stripe.Event): Promise<boolean> {
  const client = getAdmin()
  const { error } = await client.from('billing_events').insert({ provider_event_id: event.id, event_type: event.type })
  if (!error) return true
  if (error.code === '23505') return false
  throw new EntitlementError('DATABASE', 'Evenimentul de facturare nu a putut fi salvat.')
}
