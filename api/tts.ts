import type { VercelRequest, VercelResponse } from '@vercel/node'
import { chunkText } from '../src/server/tts/chunkText'
import { detectLanguage, normalizeLanguage } from '../src/server/tts/language'
import { normalizeRomanianText } from '../src/server/tts/normalizeRomanianText'
import { getTtsProvider } from '../src/server/tts/ttsProviderFactory'
import { TtsProviderError } from '../src/server/tts/ttsProvider'

const MAX_CHARACTERS = 4000
const cache = new Map<string, { expiresAt: number; chunks: string[]; language: string; voice: { name: string; languageCode: string; gender?: string } }>()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ error: 'Metodă nepermisă.' }); return }
  const body = req.body as { text?: unknown; language?: unknown }
  if (typeof body?.text !== 'string' || body.text.trim().length === 0 || body.text.length > MAX_CHARACTERS) { res.status(400).json({ error: `Textul trebuie să aibă între 1 și ${MAX_CHARACTERS} de caractere.` }); return }
  const language = body.language ? normalizeLanguage(body.language) : detectLanguage(body.text)
  const normalized = normalizeRomanianText(body.text, language)
  const cacheKey = `${language}:${normalized}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) { res.status(200).json({ ...cached, characterCount: body.text.length }); return }
  try {
    const provider = getTtsProvider()
    const voices = await provider.getAvailableVoices(language)
    const voice = voices[0]
    if (!voice) { res.status(422).json({ error: 'Nu există o voce configurată pentru limba selectată.' }); return }
    const chunks = await Promise.all(chunkText(normalized).map(async (chunk) => Buffer.from(await provider.synthesize(chunk, voice)).toString('base64')))
    const payload = { language, voice, chunks, characterCount: body.text.length }
    cache.set(cacheKey, { ...payload, expiresAt: Date.now() + 15 * 60 * 1000 })
    console.info(JSON.stringify({ event: 'tts_synthesis_succeeded', language, chunks: chunks.length, characters: body.text.length }))
    res.status(200).json(payload)
  } catch (error) {
    console.error(JSON.stringify({ event: 'tts_synthesis_failed', language, retryable: error instanceof TtsProviderError ? error.retryable : false }))
    res.status(error instanceof TtsProviderError && error.retryable ? 503 : 502).json({ error: 'Serviciul de voce nu a putut genera lectura. Încearcă din nou.' })
  }
}
