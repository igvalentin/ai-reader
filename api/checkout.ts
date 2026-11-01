import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  AuthConfigurationError,
  verifySupabaseUser,
  UnauthorizedError,
} from '../src/server/auth/verifySupabaseUser.js'
import { associateAnonymousUsage, EntitlementError } from '../src/server/entitlement/entitlement.js'
import { createCheckoutSession } from '../src/server/billing/billing.js'
import { findSubscriptionPlan } from '../src/server/billing/plans.js'

const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ code: 'METHOD_NOT_ALLOWED', error: 'Metodă nepermisă.' })
  }
  const body = req.body as { planId?: unknown; requestId?: unknown } | null
  const plan = findSubscriptionPlan(body?.planId)
  if (!plan || typeof body?.requestId !== 'string' || !REQUEST_ID_PATTERN.test(body.requestId)) {
    return res.status(400).json({
      code: 'INVALID_CHECKOUT_REQUEST',
      error: 'Alege unul dintre planurile disponibile și încearcă din nou.',
    })
  }

  try {
    const userId = await verifySupabaseUser(req.headers.authorization)
    await associateAnonymousUsage(userId, req.headers.cookie)
    const url = await createCheckoutSession(userId, plan.id, body.requestId)
    return res.status(200).json({ url })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        code: 'AUTHENTICATION_REQUIRED',
        error: 'Autentifică-te pentru a începe abonamentul.',
      })
    }
    if (error instanceof AuthConfigurationError) {
      return res.status(500).json({
        code: 'AUTH_CONFIGURATION_ERROR',
        error: 'Autentificarea nu este configurată complet pe server.',
      })
    }
    if (error instanceof EntitlementError) {
      if (error.code === 'SUBSCRIPTION_ACTIVE') {
        return res.status(409).json({ code: 'SUBSCRIPTION_ACTIVE', error: error.message })
      }
      const code = error.code === 'CONFIGURATION' ? 'BILLING_CONFIGURATION_ERROR' : 'BILLING_ERROR'
      console.error(JSON.stringify({ event: 'checkout_session_failed', code }))
      return res.status(500).json({ code, error: error.message })
    }
    const stripeError =
      typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {}
    console.error(
      JSON.stringify({
        event: 'checkout_session_failed',
        planId: plan.id,
        errorType:
          typeof stripeError.type === 'string'
            ? stripeError.type
            : error instanceof Error
              ? error.name
              : 'unknown',
        ...(typeof stripeError.code === 'string' ? { stripeCode: stripeError.code } : {}),
        ...(typeof stripeError.statusCode === 'number'
          ? { statusCode: stripeError.statusCode }
          : {}),
        ...(typeof stripeError.requestId === 'string'
          ? { stripeRequestId: stripeError.requestId }
          : {}),
        ...(typeof stripeError.param === 'string' ? { stripeParameter: stripeError.param } : {}),
      }),
    )
    return res.status(502).json({
      code: 'CHECKOUT_UNAVAILABLE',
      error: 'Checkout-ul nu a putut fi inițiat. Încearcă din nou.',
    })
  }
}
