import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import {
  applyStripeSubscriptionEvent,
  getStripe,
  recordBillingEvent,
  resolveUserIdForCustomer,
} from '../src/server/billing/billing.js'

export const config = { api: { bodyParser: false } }

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) return req.body
  if (typeof req.body === 'string') return Buffer.from(req.body)
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return Buffer.concat(chunks)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Metodă nepermisă.' })
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return res.status(500).json({ error: 'Configurarea webhook-ului lipsește.' })
  try {
    const event = getStripe().webhooks.constructEvent(
      await readRawBody(req),
      req.headers['stripe-signature'] as string,
      secret,
    )
    let processed = false
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.client_reference_id ?? session.metadata?.app_user_id
      if (userId && session.subscription) {
        const subscription = await getStripe().subscriptions.retrieve(
          typeof session.subscription === 'string' ? session.subscription : session.subscription.id,
        )
        processed = await applyStripeSubscriptionEvent(
          event,
          userId,
          subscription,
          typeof session.customer === 'string' ? session.customer : session.customer?.id,
        )
      } else {
        processed = await recordBillingEvent(event)
      }
    } else if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object as Stripe.Subscription
      const customerId =
        typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
      const userId = await resolveUserIdForCustomer(customerId)
      processed = userId
        ? await applyStripeSubscriptionEvent(event, userId, subscription, customerId)
        : await recordBillingEvent(event)
    } else if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as unknown as {
        subscription?: string | { id: string } | null
        parent?: {
          subscription_details?: { subscription?: string | { id: string } | null } | null
        } | null
      }
      const subscriptionReference =
        invoice.subscription ?? invoice.parent?.subscription_details?.subscription
      const subscriptionId =
        typeof subscriptionReference === 'string'
          ? subscriptionReference
          : subscriptionReference?.id
      if (!subscriptionId) {
        processed = await recordBillingEvent(event)
      } else {
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id
        const userId = await resolveUserIdForCustomer(customerId)
        processed = userId
          ? await applyStripeSubscriptionEvent(event, userId, subscription, customerId)
          : await recordBillingEvent(event)
      }
    } else {
      processed = await recordBillingEvent(event)
    }
    if (!processed) return res.status(200).json({ received: true, duplicate: true })
    return res.status(200).json({ received: true })
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'stripe_webhook_failed',
        reason:
          error instanceof Stripe.errors.StripeSignatureVerificationError
            ? 'invalid_signature'
            : 'processing_error',
      }),
    )
    return res
      .status(error instanceof Stripe.errors.StripeSignatureVerificationError ? 400 : 500)
      .json({ error: 'Webhook invalid sau nereușit.' })
  }
}
