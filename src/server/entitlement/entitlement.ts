import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

export const ANONYMOUS_COOKIE = 'ai_reader_anon'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export type Entitlement = { userId: string | null; anonymousId: string | null; setCookie?: string }

export class EntitlementError extends Error {
  constructor(
    public readonly code: 'PAYWALL' | 'SUBSCRIPTION_ACTIVE' | 'CONFIGURATION' | 'DATABASE',
    message: string,
  ) {
    super(message)
  }
}

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key)
    throw new EntitlementError('CONFIGURATION', 'Configurarea serverului pentru lecturi lipsește.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function getSigningSecret(): string {
  const secret = process.env.ANONYMOUS_USAGE_SECRET
  if (!secret)
    throw new EntitlementError('CONFIGURATION', 'Configurarea identificatorului anonim lipsește.')
  return secret
}

function sign(id: string): string {
  return createHmac('sha256', getSigningSecret()).update(id).digest('hex')
}

export function hashAnonymousId(id: string): string {
  return createHmac('sha256', getSigningSecret()).update(id).digest('hex')
}

function parseCookieHeader(header: string | undefined): Record<string, string> {
  return Object.fromEntries(
    (header ?? '')
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([key, value]) => key && value),
  )
}

function validAnonymousCookie(value: string | undefined): string | null {
  if (!value) return null
  const [id, signature] = value.split('.')
  if (!id || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return null
  const signatureBytes = Buffer.from(signature, 'hex')
  const expectedBytes = Buffer.from(sign(id), 'hex')
  if (
    signatureBytes.length !== expectedBytes.length ||
    !timingSafeEqual(signatureBytes, expectedBytes)
  )
    return null
  return id
}

export function getAnonymousCookie(header: string | undefined): string | null {
  return validAnonymousCookie(parseCookieHeader(header)[ANONYMOUS_COOKIE])
}

export function createAnonymousCookie(): { id: string; header: string } {
  const id = randomUUID()
  return {
    id,
    header: `${ANONYMOUS_COOKIE}=${id}.${sign(id)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=Lax`,
  }
}

export async function resolveEntitlementIdentity(
  authorization: string | undefined,
  cookie: string | undefined,
  verifyUser: (value: string | undefined) => Promise<string>,
): Promise<Entitlement> {
  if (authorization) return { userId: await verifyUser(authorization), anonymousId: null }
  const anonymousId = getAnonymousCookie(cookie)
  if (anonymousId) return { userId: null, anonymousId }
  const created = createAnonymousCookie()
  return { userId: null, anonymousId: created.id, setCookie: created.header }
}

export function hasActiveSubscription(
  subscription: { status?: string | null; current_period_end?: string | null } | null | undefined,
  now = new Date(),
): boolean {
  if (subscription?.status !== 'active' && subscription?.status !== 'trialing') return false
  if (!subscription.current_period_end) return false
  const expiry = Date.parse(subscription.current_period_end)
  return Number.isFinite(expiry) && expiry > now.getTime()
}

export async function canGenerateReading(entitlement: Entitlement): Promise<boolean> {
  if (!entitlement.userId && !entitlement.anonymousId) {
    throw new EntitlementError('CONFIGURATION', 'Identitatea lecturii lipsește.')
  }
  const supabase = getSupabaseAdmin()
  if (entitlement.userId) {
    const [{ data: subscription, error: subscriptionError }, { data: usage, error: usageError }] =
      await Promise.all([
        supabase
          .from('subscriptions')
          .select('status,current_period_end')
          .eq('user_id', entitlement.userId)
          .maybeSingle(),
        supabase
          .from('reading_usage')
          .select('free_reading_used')
          .eq('user_id', entitlement.userId)
          .maybeSingle(),
      ])
    if (subscriptionError || usageError) {
      throw new EntitlementError('DATABASE', 'Nu am putut verifica dreptul de lectură.')
    }
    if (hasActiveSubscription(subscription)) return true
    return usage?.free_reading_used !== true
  }
  const identifierHash = hashAnonymousId(entitlement.anonymousId as string)
  const { data, error } = await supabase
    .from('anonymous_reading_usage')
    .select('identifier_hash')
    .eq('identifier_hash', identifierHash)
    .maybeSingle()
  if (error) throw new EntitlementError('DATABASE', 'Nu am putut verifica dreptul de lectură.')
  return !data
}

export async function claimSuccessfulReading(
  entitlement: Entitlement,
): Promise<{ subscription: boolean }> {
  if (!entitlement.userId && !entitlement.anonymousId) {
    throw new EntitlementError('CONFIGURATION', 'Identitatea lecturii lipsește.')
  }
  const supabase = getSupabaseAdmin()
  const identifierHash = entitlement.anonymousId ? hashAnonymousId(entitlement.anonymousId) : null
  const { data, error } = await supabase.rpc('claim_free_reading', {
    p_user_id: entitlement.userId,
    p_anonymous_hash: identifierHash,
  })
  if (error) throw new EntitlementError('DATABASE', 'Nu am putut confirma lectura.')
  const result = data as { allowed?: boolean; subscription?: boolean } | null
  if (!result?.allowed)
    throw new EntitlementError(
      'PAYWALL',
      'Lectura gratuită a fost folosită. Activează un abonament pentru a continua.',
    )
  return { subscription: Boolean(result.subscription) }
}

export async function associateAnonymousUsage(
  userId: string,
  cookieHeader: string | undefined,
): Promise<void> {
  const anonymousId = getAnonymousCookie(cookieHeader)
  if (!anonymousId) return
  const identifierHash = hashAnonymousId(anonymousId)
  const supabase = getSupabaseAdmin()
  const { data: anonymousUsage, error: readError } = await supabase
    .from('anonymous_reading_usage')
    .select('identifier_hash')
    .eq('identifier_hash', identifierHash)
    .maybeSingle()
  if (readError)
    throw new EntitlementError('DATABASE', 'Utilizarea anonimă nu a putut fi asociată contului.')
  if (anonymousUsage) {
    const { error } = await supabase.from('reading_usage').upsert({
      user_id: userId,
      free_reading_used: true,
      free_reading_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    if (error)
      throw new EntitlementError('DATABASE', 'Utilizarea anonimă nu a putut fi asociată contului.')
  }
  const { error: metricsError } = await supabase.rpc('merge_anonymous_usage_metrics', {
    p_user_id: userId,
    p_anonymous_hash: identifierHash,
  })
  if (metricsError) {
    throw new EntitlementError('DATABASE', 'Metricile anonime nu au putut fi asociate contului.')
  }
}

export async function getUserSubscription(userId: string) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      'status,plan_id,current_period_start,current_period_end,cancel_at_period_end,provider_customer_id',
    )
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new EntitlementError('DATABASE', 'Nu am putut verifica abonamentul.')
  return data
}
