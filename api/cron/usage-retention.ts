import type { VercelRequest, VercelResponse } from '@vercel/node'
import { timingSafeEqual } from 'node:crypto'
import { getSupabaseAdmin } from '../../src/server/entitlement/entitlement.js'

const RETENTION_DAYS = 365

function isAuthorized(authorization: string | undefined): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret || !authorization) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(authorization)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ code: 'METHOD_NOT_ALLOWED', error: 'Metodă nepermisă.' })
  }
  if (!isAuthorized(req.headers.authorization)) {
    return res.status(401).json({ code: 'UNAUTHORIZED', error: 'Autorizare cron invalidă.' })
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  try {
    const supabase = getSupabaseAdmin()
    const [metricsResult, anonymousUsageResult] = await Promise.all([
      supabase.from('usage_metrics').delete({ count: 'exact' }).lt('last_activity', cutoff),
      supabase
        .from('anonymous_reading_usage')
        .delete({ count: 'exact' })
        .lt('free_reading_used_at', cutoff),
    ])
    if (metricsResult.error || anonymousUsageResult.error) {
      console.error(JSON.stringify({ event: 'usage_retention_failed' }))
      return res
        .status(500)
        .json({ code: 'RETENTION_FAILED', error: 'Curățarea periodică nu a putut fi finalizată.' })
    }
    return res.status(200).json({
      deletedUsageMetrics: metricsResult.count ?? 0,
      deletedExpiredAnonymousUsage: anonymousUsageResult.count ?? 0,
      retentionDays: RETENTION_DAYS,
    })
  } catch {
    console.error(JSON.stringify({ event: 'usage_retention_failed' }))
    return res
      .status(500)
      .json({ code: 'RETENTION_FAILED', error: 'Curățarea periodică nu a putut fi finalizată.' })
  }
}
