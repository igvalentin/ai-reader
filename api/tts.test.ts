import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mocks = vi.hoisted(() => ({
  order: [] as string[],
  associateAnonymousUsage: vi.fn(),
  canGenerateReading: vi.fn(),
  claimSuccessfulReading: vi.fn(),
  resolveEntitlementIdentity: vi.fn(),
  getTtsProvider: vi.fn(),
  getAvailableVoices: vi.fn(),
  synthesize: vi.fn(),
  recordAudioAttempt: vi.fn(),
}))

vi.mock('../src/server/auth/verifySupabaseUser.js', () => ({
  AuthConfigurationError: class AuthConfigurationError extends Error {},
  UnauthorizedError: class UnauthorizedError extends Error {},
  verifySupabaseUser: vi.fn(),
}))

vi.mock('../src/server/entitlement/entitlement.js', () => ({
  EntitlementError: class EntitlementError extends Error {
    constructor(
      public readonly code: 'PAYWALL' | 'SUBSCRIPTION_ACTIVE' | 'CONFIGURATION' | 'DATABASE',
      message: string,
    ) {
      super(message)
    }
  },
  associateAnonymousUsage: mocks.associateAnonymousUsage,
  canGenerateReading: mocks.canGenerateReading,
  claimSuccessfulReading: mocks.claimSuccessfulReading,
  resolveEntitlementIdentity: mocks.resolveEntitlementIdentity,
}))

vi.mock('../src/server/tts/ttsProviderFactory.js', () => ({
  getTtsProvider: mocks.getTtsProvider,
}))

vi.mock('../src/server/usage/usageMetrics.js', () => ({
  recordAudioAttempt: mocks.recordAudioAttempt,
}))

import handler from './tts'
import { TtsProviderError } from '../src/server/tts/ttsProvider.js'
import { EntitlementError } from '../src/server/entitlement/entitlement.js'
import { AuthConfigurationError, UnauthorizedError } from '../src/server/auth/verifySupabaseUser.js'

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
    mocks.associateAnonymousUsage.mockReset().mockResolvedValue(undefined)
    mocks.recordAudioAttempt.mockReset().mockResolvedValue(undefined)
    mocks.canGenerateReading.mockReset().mockResolvedValue(true)
    mocks.claimSuccessfulReading.mockReset().mockImplementation(async () => {
      mocks.order.push('claim')
      return { subscription: false }
    })
    mocks.resolveEntitlementIdentity.mockReset().mockResolvedValue({
      userId: null,
      anonymousId: 'anonymous-test',
    })
    mocks.getAvailableVoices
      .mockReset()
      .mockResolvedValue([{ name: 'test-voice', languageCode: 'ro-RO', gender: 'FEMALE' }])
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
      audioContentType: 'audio/mpeg',
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
    expect(res.jsonBody).toMatchObject({ code: 'TTS_PROVIDER_UNAVAILABLE' })
    expect(mocks.recordAudioAttempt).toHaveBeenCalledTimes(1)
    expect(mocks.claimSuccessfulReading).not.toHaveBeenCalled()
    expect(mocks.getAvailableVoices).toHaveBeenCalledWith('en-US')
  })

  it('associates prior anonymous usage for the verified authenticated user before checking entitlement', async () => {
    mocks.resolveEntitlementIdentity.mockResolvedValueOnce({
      userId: 'user-123',
      anonymousId: null,
    })
    const { req, res } = createMockReqRes({ text: 'Text autentificat.', language: 'ro-RO' })
    req.headers.authorization = 'Bearer valid-session'
    req.headers.cookie = 'ai_reader_anon=signed-cookie'

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(mocks.associateAnonymousUsage).toHaveBeenCalledWith(
      'user-123',
      'ai_reader_anon=signed-cookie',
    )
    expect(mocks.canGenerateReading).toHaveBeenCalledWith({ userId: 'user-123', anonymousId: null })
  })

  it('rejects a concurrent free-use race after synthesis without returning audio', async () => {
    mocks.claimSuccessfulReading.mockRejectedValueOnce(
      new EntitlementError('PAYWALL', 'Lectura gratuită deja folosită.'),
    )
    const { req, res } = createMockReqRes({ text: 'Lectură concurentă.', language: 'ro-RO' })

    await handler(req, res)

    expect(res.statusCode).toBe(402)
    expect(res.jsonBody).toMatchObject({ code: 'SUBSCRIPTION_REQUIRED' })
    expect(mocks.order).toEqual(['synthesize'])
  })

  it('shows the subscription-required response based on server entitlement, ignoring client flags', async () => {
    mocks.canGenerateReading.mockResolvedValue(false)
    const { req, res } = createMockReqRes({
      text: 'Another reading.',
      language: 'en-US',
      freeReadingUsed: false,
      subscriptionActive: true,
    })

    await handler(req, res)

    expect(res.statusCode).toBe(402)
    expect(res.jsonBody).toMatchObject({ code: 'SUBSCRIPTION_REQUIRED' })
    expect(mocks.getTtsProvider).not.toHaveBeenCalled()
    expect(mocks.claimSuccessfulReading).not.toHaveBeenCalled()
  })

  it('returns a distinct authentication-required response for an invalid session', async () => {
    mocks.resolveEntitlementIdentity.mockRejectedValueOnce(new UnauthorizedError())
    const { req, res } = createMockReqRes({ text: 'Salut.', language: 'en-US' })

    await handler(req, res)

    expect(res.statusCode).toBe(401)
    expect(res.jsonBody).toMatchObject({ code: 'AUTHENTICATION_REQUIRED' })
    expect(mocks.getTtsProvider).not.toHaveBeenCalled()
  })

  it('does not misreport a missing Supabase auth key as an Azure 503', async () => {
    mocks.resolveEntitlementIdentity.mockRejectedValueOnce(new AuthConfigurationError())
    const { req, res } = createMockReqRes({ text: 'Salut.', language: 'en-US' })

    await handler(req, res)

    expect(res.statusCode).toBe(500)
    expect(res.jsonBody).toMatchObject({ code: 'AUTH_CONFIGURATION_ERROR' })
    expect(mocks.getTtsProvider).not.toHaveBeenCalled()
  })

  it('rejects unsupported language codes instead of silently selecting a voice', async () => {
    const { req, res } = createMockReqRes({ text: 'Bonjour.', language: 'fr-FR' })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(mocks.getTtsProvider).not.toHaveBeenCalled()
    expect(mocks.claimSuccessfulReading).not.toHaveBeenCalled()
  })

  it('rejects empty text with a structured validation error before authentication or synthesis', async () => {
    const { req, res } = createMockReqRes({ text: '   ' })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res.jsonBody).toMatchObject({ code: 'INVALID_TEXT' })
    expect(mocks.getTtsProvider).not.toHaveBeenCalled()
    expect(mocks.resolveEntitlementIdentity).not.toHaveBeenCalled()
  })

  it('does not reuse generated audio across separate requests with the same text', async () => {
    const first = createMockReqRes({ text: 'Private text for cache isolation.', language: 'en-US' })
    const second = createMockReqRes({
      text: 'Private text for cache isolation.',
      language: 'en-US',
    })

    await handler(first.req, first.res)
    await handler(second.req, second.res)

    expect(mocks.synthesize).toHaveBeenCalledTimes(2)
    expect(mocks.claimSuccessfulReading).toHaveBeenCalledTimes(2)
  })
})
