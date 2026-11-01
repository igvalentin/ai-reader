import {
  EntitlementError,
  getSupabaseAdmin,
  hasActiveSubscription,
} from '../entitlement/entitlement.js'

export type AdminCategory = 'all' | 'anonymous' | 'registered-unpaid' | 'subscribers'

interface UsageMetricRow {
  actor_type: 'anonymous' | 'registered'
  user_id: string | null
  anonymous_hash: string | null
  first_seen: string
  last_activity: string
  ocr_attempts: number
  audio_attempts: number
  successful_audio_generations: number
}

interface SubscriptionRow {
  user_id: string
  status: string
  plan_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  provider_customer_id: string | null
}

interface UserUsageRow {
  user_id: string
  free_reading_used: boolean
}

interface AnonymousUsageRow {
  identifier_hash: string
  free_reading_used_at: string
}

export interface AdminUserRow {
  readonly id: string
  readonly category: Exclude<AdminCategory, 'all'>
  readonly userId: string | null
  readonly email: string | null
  readonly anonymousId: string | null
  readonly firstSeen: string | null
  readonly lastActivity: string | null
  readonly ocrAttempts: number
  readonly audioAttempts: number
  readonly successfulAudioGenerations: number
  readonly freeReadingConsumed: boolean
  readonly planId: string | null
  readonly subscriptionStatus: string | null
  readonly subscriptionStart: string | null
  readonly subscriptionExpiry: string | null
  readonly providerCustomerId: string | null
}

export interface AdminUsersResult {
  readonly rows: AdminUserRow[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
  readonly summary: {
    readonly anonymousVisitors: number
    readonly registeredUnpaid: number
    readonly subscribers: number
  }
}

function throwDatabaseError(): never {
  throw new EntitlementError('DATABASE', 'Datele de administrare nu au putut fi încărcate.')
}

async function fetchAllRows<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: T[] | null
    error: { message?: string } | null
  }>,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await fetchPage(from, from + 999)
    if (error) throwDatabaseError()
    const page = data ?? []
    rows.push(...page)
    if (page.length < 1000) return rows
  }
}

async function listAuthUsers() {
  const client = getSupabaseAdmin()
  const users = []
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throwDatabaseError()
    users.push(...data.users)
    if (data.users.length < 1000) break
  }
  return users
}

export async function getAdminUsers(
  search: string,
  category: AdminCategory,
  page: number,
  pageSize: number,
): Promise<AdminUsersResult> {
  const client = getSupabaseAdmin()
  const [users, metrics, subscriptions, usages, anonymousUsage] = await Promise.all([
    listAuthUsers(),
    fetchAllRows<UsageMetricRow>((from, to) =>
      client
        .from('usage_metrics')
        .select(
          'actor_type,user_id,anonymous_hash,first_seen,last_activity,ocr_attempts,audio_attempts,successful_audio_generations',
        )
        .range(from, to),
    ),
    fetchAllRows<SubscriptionRow>((from, to) =>
      client
        .from('subscriptions')
        .select(
          'user_id,status,plan_id,current_period_start,current_period_end,cancel_at_period_end,provider_customer_id',
        )
        .range(from, to),
    ),
    fetchAllRows<UserUsageRow>((from, to) =>
      client.from('reading_usage').select('user_id,free_reading_used').range(from, to),
    ),
    fetchAllRows<AnonymousUsageRow>((from, to) =>
      client
        .from('anonymous_reading_usage')
        .select('identifier_hash,free_reading_used_at')
        .range(from, to),
    ),
  ])
  const metricByUser = new Map(
    metrics.filter((row) => row.user_id).map((row) => [row.user_id as string, row]),
  )
  const subscriptionByUser = new Map(subscriptions.map((row) => [row.user_id, row]))
  const usageByUser = new Map(usages.map((row) => [row.user_id, row]))
  const metricByAnonymousHash = new Map(
    metrics.filter((row) => row.anonymous_hash).map((row) => [row.anonymous_hash as string, row]),
  )
  const freeAnonymousHashes = new Map(
    anonymousUsage.map((row) => [row.identifier_hash, row.free_reading_used_at]),
  )
  const rows: AdminUserRow[] = []

  for (const user of users) {
    const userMetric = metricByUser.get(user.id)
    const subscription = subscriptionByUser.get(user.id)
    const active = hasActiveSubscription(subscription)
    rows.push({
      id: user.id,
      category: active ? 'subscribers' : 'registered-unpaid',
      userId: user.id,
      email: user.email ?? null,
      anonymousId: null,
      firstSeen: userMetric?.first_seen ?? user.created_at,
      lastActivity: userMetric?.last_activity ?? null,
      ocrAttempts: Number(userMetric?.ocr_attempts ?? 0),
      audioAttempts: Number(userMetric?.audio_attempts ?? 0),
      successfulAudioGenerations: Number(userMetric?.successful_audio_generations ?? 0),
      freeReadingConsumed: usageByUser.get(user.id)?.free_reading_used === true,
      planId: subscription?.plan_id ?? null,
      subscriptionStatus: subscription
        ? active
          ? subscription.status
          : subscription.current_period_end &&
              Date.parse(subscription.current_period_end) <= Date.now()
            ? 'expired'
            : subscription.status
        : null,
      subscriptionStart: subscription?.current_period_start ?? null,
      subscriptionExpiry: subscription?.current_period_end ?? null,
      providerCustomerId: subscription?.provider_customer_id ?? null,
    })
  }

  const anonymousHashes = new Set([...metricByAnonymousHash.keys(), ...freeAnonymousHashes.keys()])
  for (const hash of anonymousHashes) {
    const metric = metricByAnonymousHash.get(hash)
    rows.push({
      id: `anonymous:${hash}`,
      category: 'anonymous',
      userId: null,
      email: null,
      anonymousId: hash,
      firstSeen: metric?.first_seen ?? freeAnonymousHashes.get(hash) ?? null,
      lastActivity: metric?.last_activity ?? freeAnonymousHashes.get(hash) ?? null,
      ocrAttempts: Number(metric?.ocr_attempts ?? 0),
      audioAttempts: Number(metric?.audio_attempts ?? 0),
      successfulAudioGenerations: Number(metric?.successful_audio_generations ?? 0),
      freeReadingConsumed: freeAnonymousHashes.has(hash),
      planId: null,
      subscriptionStatus: null,
      subscriptionStart: null,
      subscriptionExpiry: null,
      providerCustomerId: null,
    })
  }

  const summary = {
    anonymousVisitors: rows.filter((row) => row.category === 'anonymous').length,
    registeredUnpaid: rows.filter((row) => row.category === 'registered-unpaid').length,
    subscribers: rows.filter((row) => row.category === 'subscribers').length,
  }
  const normalizedSearch = search.trim().toLowerCase()
  const filtered = rows
    .filter((row) => category === 'all' || row.category === category)
    .filter((row) => {
      if (!normalizedSearch) return true
      return [row.email, row.userId, row.anonymousId].some((value) =>
        value?.toLowerCase().includes(normalizedSearch),
      )
    })
    .sort((left, right) =>
      (right.lastActivity ?? right.firstSeen ?? '').localeCompare(
        left.lastActivity ?? left.firstSeen ?? '',
      ),
    )
  const start = (page - 1) * pageSize

  return {
    rows: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
    summary,
  }
}
