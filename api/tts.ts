import type { VercelRequest, VercelResponse } from '@vercel/node'
import { chunkText } from '../src/server/tts/chunkText.js'
import { detectLanguage, normalizeLanguage } from '../src/server/tts/language.js'
import { normalizeRomanianText } from '../src/server/tts/normalizeRomanianText.js'
import { getTtsProvider } from '../src/server/tts/ttsProviderFactory.js'
import { TtsProviderError } from '../src/server/tts/ttsProvider.js'
import { verifySupabaseUser, UnauthorizedError } from '../src/server/auth/verifySupabaseUser.js'
import {
  canGenerateReading,
  claimSuccessfulReading,
  EntitlementError,
  resolveEntitlementIdentity,
} from '../src/server/entitlement/entitlement.js'

const MAX_CHARACTERS = 4000

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ code: 'METHOD_NOT_ALLOWED', error: 'Metodă nepermisă.' })
  }
  const body = req.body as { text?: unknown; language?: unknown } | null
  if (
    typeof body?.text !== 'string' ||
    body.text.trim().length === 0 ||
    body.text.length > MAX_CHARACTERS
  ) {
    return res.status(400).json({
      code: 'INVALID_TEXT',
      error: `Textul trebuie să aibă între 1 și ${MAX_CHARACTERS} de caractere.`,
    })
  }
  const requestedLanguage = body.language
  const supportedLanguages = ['ro', 'ro-RO', 'en-US', 'en-GB']
  if (
    requestedLanguage !== undefined &&
    requestedLanguage !== '' &&
    (typeof requestedLanguage !== 'string' || !supportedLanguages.includes(requestedLanguage))
  ) {
    return res
      .status(400)
      .json({ code: 'INVALID_LANGUAGE', error: 'Limba selectată nu este acceptată.' })
  }
  const language = requestedLanguage
    ? normalizeLanguage(requestedLanguage)
    : detectLanguage(body.text)
  const normalized = normalizeRomanianText(body.text, language)
  if (!normalized.trim()) {
    return res
      .status(400)
      .json({ code: 'INVALID_TEXT', error: 'Textul nu conține conținut care poate fi citit.' })
  }
  try {
    const entitlement = await resolveEntitlementIdentity(
      req.headers.authorization,
      req.headers.cookie,
      verifySupabaseUser,
    )
    if (!(await canGenerateReading(entitlement))) {
      return res.status(402).json({
        code: 'PAYWALL',
        error: 'Lectura gratuită a fost folosită. Activează un abonament pentru a continua.',
      })
    }
    const provider = getTtsProvider()
    const voices = await provider.getAvailableVoices(language)
    const voice = voices[0]
    if (!voice) {
      return res.status(422).json({
        code: 'VOICE_UNAVAILABLE',
        error: 'Nu există o voce configurată pentru limba selectată.',
      })
    }
    const chunks = await Promise.all(
      chunkText(normalized).map(async (chunk) =>
        Buffer.from(await provider.synthesize(chunk, voice)).toString('base64'),
      ),
    )
    if (chunks.length === 0) {
      return res
        .status(400)
        .json({ code: 'INVALID_TEXT', error: 'Textul nu conține conținut care poate fi citit.' })
    }
    await claimSuccessfulReading(entitlement)
    const payload = {
      language,
      voice,
      chunks,
      audioContentType: 'audio/mpeg',
      characterCount: body.text.length,
    }
    if (entitlement.setCookie) res.setHeader('Set-Cookie', entitlement.setCookie)
    console.info(
      JSON.stringify({
        event: 'tts_synthesis_succeeded',
        language,
        chunks: chunks.length,
        characters: body.text.length,
      }),
    )
    return res.status(200).json(payload)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        error: 'Sesiunea a expirat. Autentifică-te și încearcă din nou.',
      })
    }
    if (error instanceof EntitlementError) {
      if (error.code === 'PAYWALL')
        return res.status(402).json({ code: 'PAYWALL', error: error.message })
      return res.status(500).json({ code: 'ENTITLEMENT_ERROR', error: error.message })
    }
    const providerError = error instanceof TtsProviderError ? error : null
    const errorCode = providerError?.code ?? 'TTS_UNAVAILABLE'
    const retryable = providerError?.retryable ?? true
    const status =
      errorCode === 'TTS_TIMEOUT' || errorCode === 'TTS_NOT_CONFIGURED' || retryable ? 503 : 502
    console.error(
      JSON.stringify({ event: 'tts_synthesis_failed', language, code: errorCode, retryable }),
    )
    return res.status(status).json({
      code: errorCode,
      error:
        errorCode === 'TTS_TIMEOUT'
          ? 'Generarea audio a durat prea mult. Textul este în continuare disponibil; încearcă din nou.'
          : 'Generarea audio nu este disponibilă momentan. Textul este în continuare disponibil.',
    })
  }
}
