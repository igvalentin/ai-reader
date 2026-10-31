import { afterEach, describe, expect, it } from 'vitest'
import { createAnonymousCookie, getAnonymousCookie, resolveEntitlementIdentity } from './entitlement'

afterEach(() => { delete process.env.ANONYMOUS_USAGE_SECRET })

describe('signed anonymous entitlement identity', () => {
  it('accepts a server-signed cookie and rejects tampering', () => {
    process.env.ANONYMOUS_USAGE_SECRET = 'test-secret'
    const cookie = createAnonymousCookie()
    expect(getAnonymousCookie(cookie.header)).toBe(cookie.id)
    expect(getAnonymousCookie(cookie.header.replace(cookie.id, `${cookie.id}x`))).toBeNull()
    expect(getAnonymousCookie(cookie.header.replace(/\.[a-f0-9]{64}/, `.${'g'.repeat(64)}`))).toBeNull()
  })

  it('creates an anonymous identity without requiring registration', async () => {
    process.env.ANONYMOUS_USAGE_SECRET = 'test-secret'
    const identity = await resolveEntitlementIdentity(undefined, undefined, async () => 'unexpected-user')
    expect(identity.userId).toBeNull()
    expect(identity.anonymousId).toBeTruthy()
    expect(identity.setCookie).toContain('HttpOnly')
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
