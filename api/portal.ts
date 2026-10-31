import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifySupabaseUser, UnauthorizedError } from '../src/server/auth/verifySupabaseUser'
import { createPortalSession, EntitlementError } from '../src/server/billing/billing'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Metodă nepermisă.' }) }
  try {
    const userId = await verifySupabaseUser(req.headers.authorization)
    const url = await createPortalSession(userId)
    return res.status(200).json({ url })
  } catch (error) {
    if (error instanceof UnauthorizedError) return res.status(401).json({ error: 'Autentifică-te pentru a-ți administra abonamentul.' })
    if (error instanceof EntitlementError) return res.status(error.code === 'PAYWALL' ? 404 : 500).json({ error: error.message })
    console.error(JSON.stringify({ event: 'billing_portal_failed' }))
    return res.status(502).json({ error: 'Portalul de facturare nu este disponibil. Încearcă din nou.' })
  }
}
