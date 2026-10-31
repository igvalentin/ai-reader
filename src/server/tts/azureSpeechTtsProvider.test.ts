import { describe, expect, it, vi } from 'vitest'
import { AzureSpeechTtsProvider } from './azureSpeechTtsProvider'
import { TtsProviderError } from './ttsProvider'

const voice = { name: 'ro-RO-AlinaNeural', languageCode: 'ro-RO', gender: 'FEMALE' as const }

function createProvider(fetchImplementation: typeof fetch, timeoutMs = 100) {
  return new AzureSpeechTtsProvider({
    apiKey: 'server-test-key',
    region: 'germanywestcentral',
    timeoutMs,
    fetchImplementation,
  })
}

describe('AzureSpeechTtsProvider', () => {
  it('synthesizes Romanian SSML through the regional Azure REST endpoint as MP3', async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(Uint8Array.from([1, 2, 3]), { headers: { 'content-type': 'audio/mpeg' } }),
      )
    const provider = createProvider(fetchImplementation)

    const audio = await provider.synthesize('Bună <ziua> & bine!', voice)

    expect([...audio]).toEqual([1, 2, 3])
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://germanywestcentral.tts.speech.microsoft.com/cognitiveservices/v1',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/ssml+xml',
          'Ocp-Apim-Subscription-Key': 'server-test-key',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        }),
        body: expect.stringContaining('Bună &lt;ziua&gt; &amp; bine!'),
      }),
    )
    expect(await provider.getAvailableVoices('ro-RO')).toEqual([voice])
  })

  it('supports a validated configurable Romanian neural voice', async () => {
    const provider = new AzureSpeechTtsProvider({
      apiKey: 'server-test-key',
      region: 'germanywestcentral',
      romanianVoice: 'ro-RO-EmilNeural',
      fetchImplementation: vi.fn<typeof fetch>(),
    })
    await expect(provider.getAvailableVoices('ro')).resolves.toMatchObject([
      { name: 'ro-RO-EmilNeural' },
    ])
    expect(
      () =>
        new AzureSpeechTtsProvider({
          apiKey: 'server-test-key',
          region: 'germanywestcentral',
          romanianVoice: 'bad"><voice',
        }),
    ).toThrow('voice configuration is invalid')
  })

  it('rejects empty, control-character, and oversized input before calling Azure', async () => {
    const fetchImplementation = vi.fn<typeof fetch>()
    const provider = createProvider(fetchImplementation)

    await expect(provider.synthesize('   ', voice)).rejects.toMatchObject({
      code: 'TTS_INVALID_INPUT',
    })
    await expect(provider.synthesize('Text\u0000 invalid', voice)).rejects.toMatchObject({
      code: 'TTS_INVALID_INPUT',
    })
    await expect(provider.synthesize('ă'.repeat(2_251), voice)).rejects.toMatchObject({
      code: 'TTS_INVALID_INPUT',
    })
    expect(fetchImplementation).not.toHaveBeenCalled()
  })

  it('maps a request timeout to a safe retryable TTS error', async () => {
    const fetchImplementation: typeof fetch = (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('aborted', 'AbortError')),
          { once: true },
        )
      })
    const provider = createProvider(fetchImplementation, 5)

    await expect(provider.synthesize('Bună ziua.', voice)).rejects.toMatchObject({
      code: 'TTS_TIMEOUT',
      retryable: true,
    })
  })

  it('maps Azure errors and unexpected audio responses without exposing response details', async () => {
    const azureError = createProvider(
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('sensitive upstream diagnostics', { status: 401 })),
    )
    await expect(azureError.synthesize('Bună ziua.', voice)).rejects.toMatchObject({
      code: 'TTS_PROVIDER_ERROR',
      retryable: false,
    })

    const unexpectedResponse = createProvider(
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response('not audio', { headers: { 'content-type': 'text/plain' } }),
        ),
    )
    await expect(unexpectedResponse.synthesize('Bună ziua.', voice)).rejects.toBeInstanceOf(
      TtsProviderError,
    )
  })
})
