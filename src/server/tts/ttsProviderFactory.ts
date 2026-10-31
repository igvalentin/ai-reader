import { GoogleCloudTtsProvider } from './googleCloudTtsProvider.js'
import type { TtsProvider } from './ttsProvider.js'

let cachedProvider: TtsProvider | null = null

export function getTtsProvider(): TtsProvider {
  if (cachedProvider) return cachedProvider
  const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY
  if (!apiKey) throw new Error('Variabila de mediu GOOGLE_CLOUD_TTS_API_KEY lipsește din configurația serverului.')
  cachedProvider = new GoogleCloudTtsProvider(apiKey)
  return cachedProvider
}

export function resetTtsProviderCacheForTests(): void {
  cachedProvider = null
}
