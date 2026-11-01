import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  listUsers: vi.fn(),
}))

vi.mock('../entitlement/entitlement.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../entitlement/entitlement.js')>()
  return { ...actual, getSupabaseAdmin: mocks.getSupabaseAdmin }
})

import { getAdminUsers } from './adminUsers'

const rowsByTable: Record<string, unknown[]> = {}

describe('getAdminUsers', () => {
  beforeEach(() => {
    Object.keys(rowsByTable).forEach((key) => delete rowsByTable[key])
    mocks.listUsers.mockReset().mockResolvedValue({
      data: {
        users: [
          {
            id: 'user-subscriber',
            email: 'paid@example.com',
            created_at: '2026-01-01T00:00:00.000Z',
          },
          { id: 'user-free', email: 'free@example.com', created_at: '2026-02-01T00:00:00.000Z' },
        ],
      },
      error: null,
    })
    mocks.from.mockReset().mockImplementation((table: string) => ({
      select: () => ({
        range: async () => ({ data: rowsByTable[table] ?? [], error: null }),
      }),
    }))
    mocks.getSupabaseAdmin.mockReset().mockReturnValue({
      auth: { admin: { listUsers: mocks.listUsers } },
      from: mocks.from,
    })
  })

  it('combines authenticated and anonymous activity into the three admin categories', async () => {
    rowsByTable.usage_metrics = [
      {
        actor_type: 'registered',
        user_id: 'user-subscriber',
        anonymous_hash: null,
        first_seen: '2026-01-02T00:00:00.000Z',
        last_activity: '2026-10-01T00:00:00.000Z',
        ocr_attempts: 3,
        audio_attempts: 5,
        successful_audio_generations: 4,
      },
      {
        actor_type: 'anonymous',
        user_id: null,
        anonymous_hash: 'hash-anonymous',
        first_seen: '2026-03-01T00:00:00.000Z',
        last_activity: '2026-10-02T00:00:00.000Z',
        ocr_attempts: 2,
        audio_attempts: 3,
        successful_audio_generations: 1,
      },
    ]
    rowsByTable.subscriptions = [
      {
        user_id: 'user-subscriber',
        status: 'active',
        plan_id: '30-days',
        current_period_start: '2026-10-01T00:00:00.000Z',
        current_period_end: new Date(Date.now() + 86400000).toISOString(),
        cancel_at_period_end: false,
        provider_customer_id: 'cus_private_admin_only',
      },
    ]
    rowsByTable.reading_usage = [{ user_id: 'user-free', free_reading_used: true }]
    rowsByTable.anonymous_reading_usage = [
      {
        identifier_hash: 'hash-anonymous',
        free_reading_used_at: '2026-03-02T00:00:00.000Z',
      },
    ]

    const result = await getAdminUsers('', 'all', 1, 50)

    expect(result.summary).toEqual({ anonymousVisitors: 1, registeredUnpaid: 1, subscribers: 1 })
    expect(result.rows).toContainEqual(
      expect.objectContaining({
        email: 'paid@example.com',
        category: 'subscribers',
        planId: '30-days',
        providerCustomerId: 'cus_private_admin_only',
        audioAttempts: 5,
        successfulAudioGenerations: 4,
      }),
    )
    expect(result.rows).toContainEqual(
      expect.objectContaining({
        email: 'free@example.com',
        category: 'registered-unpaid',
        freeReadingConsumed: true,
      }),
    )
    expect(result.rows).toContainEqual(
      expect.objectContaining({
        anonymousId: 'hash-anonymous',
        category: 'anonymous',
        ocrAttempts: 2,
        audioAttempts: 3,
        successfulAudioGenerations: 1,
      }),
    )
  })

  it('filters by category and case-insensitive email before paging', async () => {
    rowsByTable.subscriptions = [
      {
        user_id: 'user-subscriber',
        status: 'active',
        plan_id: '7-days',
        current_period_start: '2026-10-01T00:00:00.000Z',
        current_period_end: new Date(Date.now() + 86400000).toISOString(),
        cancel_at_period_end: false,
        provider_customer_id: 'cus_test',
      },
    ]

    const result = await getAdminUsers('PAID@EXAMPLE.COM', 'subscribers', 1, 10)

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].email).toBe('paid@example.com')
    expect(result.total).toBe(1)
  })
})
