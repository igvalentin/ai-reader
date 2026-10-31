import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mocks = vi.hoisted(() => ({
  order: [] as string[],
  canGenerateReading: vi.fn(),
  claimSuccessfulReading: vi.fn(),
  resolveEntitlementIdentity: vi.fn(),
  getTtsProvider: vi.fn(),
  getAvailableVoices: vi.fn(),
  synthesize: vi.fn(),
}))

vi.mock('../src/server/auth/verifySupabaseUser.js', () => ({
  UnauthorizedError: class UnauthorizedError extends Error {},
  verifySupabaseUser: vi.fn(),
}))

vi.mock('../src/server/entitlement/entitlement.js', () => ({
  EntitlementError: class EntitlementError extends Error {
    constructor(public readonly code: 'PAYWALL' | 'CONFIGURATION' | 'DATABASE', message: string) {
      super(message)
    }
  },
  canGenerateReading: mocks.canGenerateReading,
  claimSuccessfulReading: mocks.claimSuccessfulReading,
  resolveEntitlementIdentity: mocks.resolveEntitlementIdentity,
}))

vi.mock('../src/server/tts/ttsProviderFactory.js', () => ({
  getTtsProvider: mocks.getTtsProvider,
}))

import handler from './tts'
import { TtsProviderError } from '../src/server/tts/ttsProvider.js'

function createMockReqRes(body: unknown, method = 'POST') {
  const req = {
    method,
    headers: { authorization: undefined, cookie: undefined },
    body,
  } as unknown as VercelRequest

  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    jsonBody: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value
      return this
    },
    json(value: unknown) {
      this.jsonBody = value
      return this
    },
  }

  return { req, res: res as unknown as VercelResponse & typeof res }
}

describe('POST /api/tts', () => {
  beforeEach(() => {
    mocks.order.length = 0
    mocks.canGenerateReading.mockReset().mockResolvedValue(true)
    mocks.claimSuccessfulReading.mockReset().mockImplementation(async () => {
      mocks.order.push('claim')
      return { subscription: false }
    })
    mocks.resolveEntitlementIdentity.mockReset().mockResolvedValue({
      userId: null,
      anonymousId: 'anonymous-test',
    })
    mocks.getAvailableVoices.mockReset().mockResolvedValue([
      { name: 'test-voice', languageCode: 'ro-RO', gender: 'FEMALE' },
    ])
    mocks.synthesize.mockReset().mockImplementation(async () => {
      mocks.order.push('synthesize')
      return Uint8Array.from([1, 2, 3])
    })
    mocks.getTtsProvider.mockReset().mockReturnValue({
      detectLanguage: vi.fn(),
      getAvailableVoices: mocks.getAvailableVoices,
      synthesize: mocks.synthesize,
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('returns audio for Romanian text and claims the free reading only after synthesis succeeds', async () => {
    const { req, res } = createMockReqRes({ text: 'Bună ziua.', language: 'ro-RO' })

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.headers['Cache-Control']).toBe('private, no-store')
    expect(res.jsonBody).toMatchObject({
      language: 'ro-RO',
      chunks: [Buffer.from([1, 2, 3]).toString('base64')],
      characterCount: 10,
    })
    expect(mocks.order).toEqual(['synthesize', 'claim'])
    expect(mocks.getAvailableVoices).toHaveBeenCalledWith('ro-RO')
  })

  it('does not consume the free reading when audio generation fails', async () => {
    mocks.synthesize.mockRejectedValue(new TtsProviderError('provider unavailable', true))
    const { req, res } = createMockReqRes({ text: 'Hello there.', language: 'en-US' })

    await handler(req, res)

    expect(res.statusCode).toBe(503)
    expect(mocks.claimSuccessfulReading).not.toHaveBeenCalled()
    expect(mocks.getAvailableVoices).toHaveBeenCalledWith('en-US')
  })

  it('shows the paywall before calling the TTS provider when free usage is already consumed', async () => {
    mocks.canGenerateReading.mockResolvedValue(false)
    const { req, res } = createMockReqRes({ text: 'Another reading.', language: 'en-US' })

    await handler(req, res)

    expect(res.statusCode).toBe(402)
    expect(res.jsonBody).toMatchObject({ code: 'PAYWALL' })
    expect(mocks.getTtsProvider).not.toHaveBeenCalled()
    expect(mocks.claimSuccessfulReading).not.toHaveBeenCalled()
  })

  it('rejects unsupported language codes instead of silently selecting a voice', async () => {
    const { req, res } = createMockReqRes({ text: 'Bonjour.', language: 'fr-FR' })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(mocks.getTtsProvider).not.toHaveBeenCalled()
    expect(mocks.claimSuccessfulReading).not.toHaveBeenCalled()
  })

  it('does not reuse generated audio across separate requests with the same text', async () => {
    const first = createMockReqRes({ text: 'Private text for cache isolation.', language: 'en-US' })
    const second = createMockReqRes({ text: 'Private text for cache isolation.', language: 'en-US' })

    await handler(first.req, first.res)
    await handler(second.req, second.res)

    expect(mocks.synthesize).toHaveBeenCalledTimes(2)
    expect(mocks.claimSuccessfulReading).toHaveBeenCalledTimes(2)
  })
})
