export interface TtsVoice { name: string; languageCode: string; gender?: string }
export interface TtsResponse { language: string; voice: TtsVoice; chunks: string[]; characterCount: number }
export class TtsRequestError extends Error {}

export async function requestSpeech(text: string, language: string, signal?: AbortSignal): Promise<TtsResponse> {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }),
    signal,
  })
  const payload = (await response.json().catch(() => null)) as TtsResponse | { error?: string } | null
  if (!response.ok) throw new TtsRequestError((payload as { error?: string } | null)?.error ?? 'Generarea audio a eșuat.')
  return payload as TtsResponse
}
