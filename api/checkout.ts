import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifySupabaseUser, UnauthorizedError } from '../src/server/auth/verifySupabaseUser.js'
import { associateAnonymousUsage, EntitlementError } from '../src/server/entitlement/entitlement.js'
import { createCheckoutSession } from '../src/server/billing/billing.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store')
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Metodă nepermisă.' }) }
  try {
    const userId = await verifySupabaseUser(req.headers.authorization)
    await associateAnonymousUsage(userId, req.headers.cookie)
    const url = await createCheckoutSession(userId)
    return res.status(200).json({ url })
  } catch (error) {
    if (error instanceof UnauthorizedError) return res.status(401).json({ error: 'Autentifică-te pentru a începe abonamentul.' })
    if (error instanceof EntitlementError) return res.status(error.code === 'PAYWALL' ? 409 : 500).json({ error: error.message })
    console.error(JSON.stringify({ event: 'checkout_session_failed' }))
    return res.status(502).json({ error: 'Checkout-ul nu a putut fi inițiat. Încearcă din nou.' })
  }
}
