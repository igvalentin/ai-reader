import { AzureSpeechTtsProvider } from './azureSpeechTtsProvider.js'
import type { TtsProvider } from './ttsProvider.js'
import { TtsProviderError } from './ttsProvider.js'

let cachedProvider: TtsProvider | null = null

export function getTtsProvider(): TtsProvider {
  if (cachedProvider) return cachedProvider
  const apiKey = process.env.AZURE_SPEECH_KEY?.trim()
  const region = process.env.AZURE_SPEECH_REGION?.trim()
  if (!apiKey || !region) {
    throw new TtsProviderError(
      'Azure Speech is not configured on the server.',
      false,
      'TTS_NOT_CONFIGURED',
    )
  }
  cachedProvider = new AzureSpeechTtsProvider({
    apiKey,
    region,
    romanianVoice: process.env.AZURE_SPEECH_VOICE?.trim() || undefined,
  })
  return cachedProvider
}

export function resetTtsProviderCacheForTests(): void {
  cachedProvider = null
}
