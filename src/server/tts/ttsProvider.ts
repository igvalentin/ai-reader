export interface TtsVoice {
  readonly name: string
  readonly languageCode: string
  readonly gender?: 'MALE' | 'FEMALE' | 'NEUTRAL'
}

export interface SynthesizeOptions {
  readonly speakingRate?: number
  readonly pitch?: number
  readonly signal?: AbortSignal
}

export interface TtsProvider {
  detectLanguage(text: string): Promise<string>
  getAvailableVoices(language: string): Promise<readonly TtsVoice[]>
  synthesize(text: string, voice: TtsVoice, options?: SynthesizeOptions): Promise<Uint8Array>
}

export class TtsProviderError extends Error {
  readonly retryable: boolean

  constructor(message: string, retryable = false) {
    super(message)
    this.name = 'TtsProviderError'
    this.retryable = retryable
  }
}
