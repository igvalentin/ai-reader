import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  AuthConfigurationError,
  verifySupabaseUser,
  UnauthorizedError,
} from '../src/server/auth/verifySupabaseUser.js'
import { EntitlementError } from '../src/server/entitlement/entitlement.js'
import { createPortalSession } from '../src/server/billing/billing.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ code: 'METHOD_NOT_ALLOWED', error: 'Metodă nepermisă.' })
  }
  try {
    const userId = await verifySupabaseUser(req.headers.authorization)
    const url = await createPortalSession(userId)
    return res.status(200).json({ url })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        code: 'AUTHENTICATION_REQUIRED',
        error: 'Autentifică-te pentru a-ți administra abonamentul.',
      })
    }
    if (error instanceof AuthConfigurationError) {
      return res.status(500).json({
        code: 'AUTH_CONFIGURATION_ERROR',
        error: 'Autentificarea nu este configurată complet pe server.',
      })
    }
    if (error instanceof EntitlementError) {
      const status = error.code === 'PAYWALL' ? 404 : 500
      const code = error.code === 'PAYWALL' ? 'SUBSCRIPTION_NOT_FOUND' : 'BILLING_ERROR'
      return res.status(status).json({ code, error: error.message })
    }
    console.error(JSON.stringify({ event: 'billing_portal_failed' }))
    return res.status(502).json({
      code: 'BILLING_PORTAL_UNAVAILABLE',
      error: 'Portalul de facturare nu este disponibil. Încearcă din nou.',
    })
  }
}
