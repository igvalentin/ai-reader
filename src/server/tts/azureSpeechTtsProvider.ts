import { detectLanguage, type SupportedTtsLanguage } from './language.js'
import type { SynthesizeOptions, TtsProvider, TtsVoice } from './ttsProvider.js'
import { TtsProviderError } from './ttsProvider.js'

const DEFAULT_TIMEOUT_MS = 15_000
const MAX_TEXT_BYTES = 4_500
const AUDIO_CONTENT_TYPE = 'audio/mpeg'
const OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3'

const DEFAULT_VOICES: Record<SupportedTtsLanguage, TtsVoice> = {
  'ro-RO': { name: 'ro-RO-AlinaNeural', languageCode: 'ro-RO', gender: 'FEMALE' },
  'en-US': { name: 'en-US-JennyNeural', languageCode: 'en-US', gender: 'FEMALE' },
  'en-GB': { name: 'en-GB-SoniaNeural', languageCode: 'en-GB', gender: 'FEMALE' },
}

export interface AzureSpeechTtsProviderOptions {
  readonly apiKey: string
  readonly region: string
  readonly romanianVoice?: string
  readonly timeoutMs?: number
  readonly fetchImplementation?: typeof fetch
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
}

function hasUnsupportedControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (code < 9 || (code > 10 && code < 13) || (code > 13 && code < 32)) return true
  }
  return false
}

function normalizeLanguage(language: string): SupportedTtsLanguage | null {
  if (language === 'ro' || language === 'ro-RO') return 'ro-RO'
  if (language === 'en-US' || language === 'en-GB') return language
  return null
}

export class AzureSpeechTtsProvider implements TtsProvider {
  private readonly apiKey: string
  private readonly endpoint: string
  private readonly fetchImplementation: typeof fetch
  private readonly voices: Record<SupportedTtsLanguage, TtsVoice>
  private readonly timeoutMs: number

  constructor(options: AzureSpeechTtsProviderOptions) {
    if (!options.apiKey.trim()) throw new Error('Azure Speech key is not configured.')
    if (!/^[a-z0-9-]+$/i.test(options.region)) throw new Error('Azure Speech region is invalid.')
    if (options.romanianVoice && !/^ro-RO-[A-Za-z0-9]+Neural$/.test(options.romanianVoice)) {
      throw new Error('Azure Speech Romanian voice configuration is invalid.')
    }
    this.apiKey = options.apiKey
    this.endpoint = `https://${options.region}.tts.speech.microsoft.com/cognitiveservices/v1`
    this.fetchImplementation = options.fetchImplementation ?? fetch
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.voices = {
      ...DEFAULT_VOICES,
      'ro-RO': {
        ...DEFAULT_VOICES['ro-RO'],
        name: options.romanianVoice ?? DEFAULT_VOICES['ro-RO'].name,
      },
    }
  }

  async detectLanguage(text: string): Promise<string> {
    return detectLanguage(text)
  }

  async getAvailableVoices(language: string): Promise<readonly TtsVoice[]> {
    const normalizedLanguage = normalizeLanguage(language)
    return normalizedLanguage ? [this.voices[normalizedLanguage]] : []
  }

  async synthesize(
    text: string,
    voice: TtsVoice,
    options: SynthesizeOptions = {},
  ): Promise<Uint8Array> {
    if (typeof text !== 'string' || !text.trim() || hasUnsupportedControlCharacters(text)) {
      throw new TtsProviderError('Textul pentru sinteză este invalid.', false, 'TTS_INVALID_INPUT')
    }
    if (Buffer.byteLength(text, 'utf8') > MAX_TEXT_BYTES) {
      throw new TtsProviderError(
        'Textul depășește limita pentru un fragment vocal.',
        false,
        'TTS_INVALID_INPUT',
      )
    }
    if (!voice.name || !voice.languageCode || !normalizeLanguage(voice.languageCode)) {
      throw new TtsProviderError('Vocea selectată nu este validă.', false, 'TTS_INVALID_INPUT')
    }

    const controller = new AbortController()
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, this.timeoutMs)
    const abortFromCaller = () => controller.abort(options.signal?.reason)
    options.signal?.addEventListener('abort', abortFromCaller, { once: true })

    try {
      const response = await this.fetchImplementation(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/ssml+xml',
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'X-Microsoft-OutputFormat': OUTPUT_FORMAT,
          'User-Agent': 'ai-reader',
        },
        body: `<speak version="1.0" xml:lang="${voice.languageCode}"><voice name="${voice.name}">${escapeXml(text)}</voice></speak>`,
        signal: controller.signal,
      })

      if (!response.ok) {
        const retryable =
          response.status === 408 || response.status === 429 || response.status >= 500
        throw new TtsProviderError(
          `Azure Speech a răspuns cu ${response.status}.`,
          retryable,
          'TTS_PROVIDER_ERROR',
        )
      }
      if (!response.headers.get('content-type')?.toLowerCase().startsWith(AUDIO_CONTENT_TYPE)) {
        throw new TtsProviderError(
          'Răspunsul Azure Speech nu are un format audio acceptat.',
          false,
          'TTS_INVALID_RESPONSE',
        )
      }
      const audio = new Uint8Array(await response.arrayBuffer())
      if (audio.byteLength === 0) {
        throw new TtsProviderError(
          'Răspunsul Azure Speech nu conține audio.',
          false,
          'TTS_INVALID_RESPONSE',
        )
      }
      return audio
    } catch (error) {
      if (error instanceof TtsProviderError) throw error
      if (timedOut)
        throw new TtsProviderError('Azure Speech request timed out.', true, 'TTS_TIMEOUT')
      if (options.signal?.aborted)
        throw new TtsProviderError('Azure Speech request was cancelled.', false, 'TTS_CANCELLED')
      throw new TtsProviderError('Azure Speech request failed.', true, 'TTS_PROVIDER_ERROR')
    } finally {
      clearTimeout(timeout)
      options.signal?.removeEventListener('abort', abortFromCaller)
    }
  }
}
