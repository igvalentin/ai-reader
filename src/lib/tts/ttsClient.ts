import { getAccessToken } from '../auth/authClient'

export interface TtsVoice {
  name: string
  languageCode: string
  gender?: string
}
export interface TtsResponse {
  language: string
  voice: TtsVoice
  chunks: string[]
  audioContentType: 'audio/mpeg'
  characterCount: number
}
export class TtsRequestError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message)
  }
}

export async function requestSpeech(
  text: string,
  language: string,
  signal?: AbortSignal,
): Promise<TtsResponse> {
  const token = await getAccessToken()
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text, language }),
    signal,
  })
  const payload = (await response.json().catch(() => null)) as
    TtsResponse | { code?: string; error?: string } | null
  if (!response.ok) {
    const errorPayload = payload as { code?: string; error?: string } | null
    throw new TtsRequestError(
      errorPayload?.error ?? 'Generarea audio a eșuat.',
      errorPayload?.code,
      response.status,
    )
  }
  const speech = payload as Partial<TtsResponse> | null
  if (
    !speech ||
    speech.audioContentType !== 'audio/mpeg' ||
    !Array.isArray(speech.chunks) ||
    speech.chunks.length === 0 ||
    speech.chunks.some((chunk) => typeof chunk !== 'string' || !chunk)
  ) {
    throw new TtsRequestError(
      'Răspunsul audio primit nu este valid.',
      'INVALID_AUDIO_RESPONSE',
      response.status,
    )
  }
  return speech as TtsResponse
}
