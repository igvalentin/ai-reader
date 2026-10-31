import { detectLanguage, type SupportedTtsLanguage } from './language.js'
import type { SynthesizeOptions, TtsProvider, TtsVoice } from './ttsProvider.js'
import { TtsProviderError } from './ttsProvider.js'

const VOICES: Record<SupportedTtsLanguage, readonly TtsVoice[]> = {
  'ro-RO': [{ name: 'ro-RO-Standard-A', languageCode: 'ro-RO', gender: 'FEMALE' }],
  'en-US': [{ name: 'en-US-Neural2-C', languageCode: 'en-US', gender: 'FEMALE' }],
  'en-GB': [{ name: 'en-GB-Neural2-A', languageCode: 'en-GB', gender: 'FEMALE' }],
}

export class GoogleCloudTtsProvider implements TtsProvider {
  constructor(private readonly apiKey: string) {}

  async detectLanguage(text: string): Promise<string> {
    return detectLanguage(text)
  }

  async getAvailableVoices(language: string): Promise<readonly TtsVoice[]> {
    return VOICES[language as SupportedTtsLanguage] ?? []
  }

  async synthesize(text: string, voice: TtsVoice, options: SynthesizeOptions = {}): Promise<Uint8Array> {
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(this.apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: options.signal,
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: voice.languageCode, name: voice.name, ssmlGender: voice.gender ?? 'NEUTRAL' },
        audioConfig: { audioEncoding: 'MP3', speakingRate: options.speakingRate ?? 1, pitch: options.pitch ?? 0 },
      }),
    })
    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500
      throw new TtsProviderError(`Google Cloud TTS a răspuns cu ${response.status}.`, retryable)
    }
    const payload = (await response.json()) as { audioContent?: string }
    if (!payload.audioContent) throw new TtsProviderError('Răspunsul TTS nu conține audio.')
    return Uint8Array.from(Buffer.from(payload.audioContent, 'base64'))
  }
}
