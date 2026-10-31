import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifySupabaseUser, UnauthorizedError } from '../src/server/auth/verifySupabaseUser.js'
import { getUserSubscription, EntitlementError } from '../src/server/entitlement/entitlement.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Metodă nepermisă.' }) }
  try {
    const userId = await verifySupabaseUser(req.headers.authorization)
    const subscription = await getUserSubscription(userId)
    return res.status(200).json({ subscription })
  } catch (error) {
    if (error instanceof UnauthorizedError) return res.status(401).json({ error: 'Sesiune invalidă sau expirată.' })
    if (error instanceof EntitlementError) return res.status(500).json({ error: error.message })
    return res.status(500).json({ error: 'Statusul abonamentului nu a putut fi încărcat.' })
  }
}
