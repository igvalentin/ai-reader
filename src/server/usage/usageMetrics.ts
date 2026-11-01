import {
  EntitlementError,
  getSupabaseAdmin,
  hashAnonymousId,
  type Entitlement,
} from '../entitlement/entitlement.js'

type UsageEvent = 'ocr_attempt' | 'audio_attempt'

async function recordUsageEvent(entitlement: Entitlement, event: UsageEvent): Promise<void> {
  if (!entitlement.userId && !entitlement.anonymousId) return
  const { error } = await getSupabaseAdmin().rpc('record_usage_metric', {
    p_user_id: entitlement.userId,
    p_anonymous_hash: entitlement.anonymousId ? hashAnonymousId(entitlement.anonymousId) : null,
    p_event_type: event,
  })
  if (error) throw new EntitlementError('DATABASE', 'Activitatea nu a putut fi contorizată.')
}

export function recordOcrAttempt(entitlement: Entitlement): Promise<void> {
  return recordUsageEvent(entitlement, 'ocr_attempt')
}

export function recordAudioAttempt(entitlement: Entitlement): Promise<void> {
  return recordUsageEvent(entitlement, 'audio_attempt')
}
