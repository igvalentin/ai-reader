import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hashAnonymousId: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../entitlement/entitlement.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../entitlement/entitlement.js')>()
  return {
    ...actual,
    getSupabaseAdmin: () => ({ rpc: mocks.rpc }),
    hashAnonymousId: mocks.hashAnonymousId,
  }
})

import { recordAudioAttempt, recordOcrAttempt } from './usageMetrics'
import { EntitlementError } from '../entitlement/entitlement'

beforeEach(() => {
  mocks.hashAnonymousId.mockReset().mockReturnValue('opaque-hash')
  mocks.rpc.mockReset().mockResolvedValue({ error: null })
})

describe('recordOcrAttempt', () => {
  it('records only the hashed anonymous identifier and event type', async () => {
    await recordOcrAttempt({ userId: null, anonymousId: 'random-cookie-id' })

    expect(mocks.hashAnonymousId).toHaveBeenCalledWith('random-cookie-id')
    expect(mocks.rpc).toHaveBeenCalledWith('record_usage_metric', {
      p_user_id: null,
      p_anonymous_hash: 'opaque-hash',
      p_event_type: 'ocr_attempt',
    })
  })

  it('counts an audio request separately from a successful generation', async () => {
    await recordAudioAttempt({ userId: null, anonymousId: 'random-cookie-id' })

    expect(mocks.rpc).toHaveBeenCalledWith('record_usage_metric', {
      p_user_id: null,
      p_anonymous_hash: 'opaque-hash',
      p_event_type: 'audio_attempt',
    })
  })

  it('records registered user ID without anonymous identity', async () => {
    await recordOcrAttempt({ userId: 'user-123', anonymousId: null })

    expect(mocks.rpc).toHaveBeenCalledWith('record_usage_metric', {
      p_user_id: 'user-123',
      p_anonymous_hash: null,
      p_event_type: 'ocr_attempt',
    })
    expect(mocks.hashAnonymousId).not.toHaveBeenCalled()
  })

  it('returns a safe storage error when the metrics RPC fails', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'database detail' } })

    await expect(
      recordOcrAttempt({ userId: 'user-123', anonymousId: null }),
    ).rejects.toBeInstanceOf(EntitlementError)
  })
})
