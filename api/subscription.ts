import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  AuthConfigurationError,
  verifySupabaseUser,
  UnauthorizedError,
} from '../src/server/auth/verifySupabaseUser.js'
import {
  EntitlementError,
  getUserSubscription,
  hasActiveSubscription,
} from '../src/server/entitlement/entitlement.js'
import { reconcileCheckoutSession } from '../src/server/billing/billing.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ code: 'METHOD_NOT_ALLOWED', error: 'Metodă nepermisă.' })
  }
  const sessionId = req.query.session_id
  if (
    sessionId !== undefined &&
    (typeof sessionId !== 'string' || !/^cs_[A-Za-z0-9_]{8,255}$/.test(sessionId))
  ) {
    return res.status(400).json({ code: 'INVALID_CHECKOUT_SESSION', error: 'Sesiune Checkout invalidă.' })
  }

  try {
    const userId = await verifySupabaseUser(req.headers.authorization)
    if (sessionId) await reconcileCheckoutSession(userId, sessionId)
    const row = await getUserSubscription(userId)
    if (!row) return res.status(200).json({ subscription: null })
    const active = hasActiveSubscription(row)
    const expired =
      !active &&
      (row.status === 'active' || row.status === 'trialing') &&
      Boolean(row.current_period_end) &&
      Date.parse(row.current_period_end as string) <= Date.now()
    return res.status(200).json({
      subscription: {
        active,
        status: expired ? 'expired' : row.status,
        planId: row.plan_id,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        hasBillingAccount: Boolean(row.provider_customer_id),
      },
    })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        code: 'AUTHENTICATION_REQUIRED',
        error: 'Sesiune invalidă sau expirată.',
      })
    }
    if (error instanceof AuthConfigurationError) {
      return res.status(500).json({
        code: 'AUTH_CONFIGURATION_ERROR',
        error: 'Autentificarea nu este configurată complet pe server.',
      })
    }
    if (error instanceof EntitlementError) {
      return res.status(500).json({ code: 'ENTITLEMENT_ERROR', error: error.message })
    }
    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      error: 'Statusul abonamentului nu a putut fi încărcat.',
    })
  }
}
