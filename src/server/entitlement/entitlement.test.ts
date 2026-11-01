import { afterEach, describe, expect, it } from 'vitest'
import {
  createAnonymousCookie,
  getAnonymousCookie,
  hasActiveSubscription,
  resolveEntitlementIdentity,
} from './entitlement'

afterEach(() => {
  delete process.env.ANONYMOUS_USAGE_SECRET
})

describe('signed anonymous entitlement identity', () => {
  it('accepts a server-signed cookie and rejects tampering', () => {
    process.env.ANONYMOUS_USAGE_SECRET = 'test-secret'
    const cookie = createAnonymousCookie()
    expect(getAnonymousCookie(cookie.header)).toBe(cookie.id)
    expect(getAnonymousCookie(cookie.header.replace(cookie.id, `${cookie.id}x`))).toBeNull()
    expect(
      getAnonymousCookie(cookie.header.replace(/\.[a-f0-9]{64}/, `.${'g'.repeat(64)}`)),
    ).toBeNull()
  })

  it('creates an anonymous identity without requiring registration', async () => {
    process.env.ANONYMOUS_USAGE_SECRET = 'test-secret'
    const identity = await resolveEntitlementIdentity(
      undefined,
      undefined,
      async () => 'unexpected-user',
    )
    expect(identity.userId).toBeNull()
    expect(identity.anonymousId).toBeTruthy()
    expect(identity.setCookie).toContain('HttpOnly')
  })

  it('treats an expired or undated subscription as inactive', () => {
    const now = new Date('2026-11-01T00:00:00.000Z')

    expect(
      hasActiveSubscription(
        { status: 'active', current_period_end: '2026-10-31T23:59:59.000Z' },
        now,
      ),
    ).toBe(false)
    expect(hasActiveSubscription({ status: 'active', current_period_end: null }, now)).toBe(false)
    expect(
      hasActiveSubscription(
        { status: 'active', current_period_end: '2026-11-08T00:00:00.000Z' },
        now,
      ),
    ).toBe(true)
  })

  it('uses the verified bearer identity when supplied', async () => {
    process.env.ANONYMOUS_USAGE_SECRET = 'test-secret'
    const identity = await resolveEntitlementIdentity('Bearer token', undefined, async (header) => {
      expect(header).toBe('Bearer token')
      return 'user-123'
    })
    expect(identity).toEqual({ userId: 'user-123', anonymousId: null })
  })
})
