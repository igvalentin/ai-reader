import type { VercelRequest, VercelResponse } from '@vercel/node'
import { chunkText } from '../src/server/tts/chunkText.js'
import { detectLanguage, normalizeLanguage } from '../src/server/tts/language.js'
import { normalizeRomanianText } from '../src/server/tts/normalizeRomanianText.js'
import { getTtsProvider } from '../src/server/tts/ttsProviderFactory.js'
import { TtsProviderError } from '../src/server/tts/ttsProvider.js'
import {
  AuthConfigurationError,
  verifySupabaseUser,
  UnauthorizedError,
} from '../src/server/auth/verifySupabaseUser.js'
import {
  associateAnonymousUsage,
  canGenerateReading,
  claimSuccessfulReading,
  EntitlementError,
  resolveEntitlementIdentity,
} from '../src/server/entitlement/entitlement.js'
import { recordAudioAttempt } from '../src/server/usage/usageMetrics.js'

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
    if (entitlement.setCookie) res.setHeader('Set-Cookie', entitlement.setCookie)
    try {
      await recordAudioAttempt(entitlement)
    } catch {
      console.error(JSON.stringify({ event: 'tts_activity_metric_failed' }))
    }
    if (entitlement.userId) {
      await associateAnonymousUsage(entitlement.userId, req.headers.cookie)
    }
    if (!(await canGenerateReading(entitlement))) {
      return res.status(402).json({
        code: 'SUBSCRIPTION_REQUIRED',
        error: 'Lectura gratuită a fost folosită. Alege un abonament pentru a continua.',
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
        code: 'AUTHENTICATION_REQUIRED',
        error: 'Sesiunea a expirat. Autentifică-te și încearcă din nou.',
      })
    }
    if (error instanceof AuthConfigurationError) {
      console.error(JSON.stringify({ event: 'tts_auth_configuration_failed' }))
      return res.status(500).json({
        code: 'AUTH_CONFIGURATION_ERROR',
        error: 'Autentificarea nu este configurată complet pe server. Încearcă din nou mai târziu.',
      })
    }
    if (error instanceof EntitlementError) {
      if (error.code === 'PAYWALL') {
        return res.status(402).json({
          code: 'SUBSCRIPTION_REQUIRED',
          error: 'Lectura gratuită a fost folosită. Alege un abonament pentru a continua.',
        })
      }
      console.error(JSON.stringify({ event: 'tts_entitlement_failed', code: error.code }))
      return res.status(500).json({ code: 'ENTITLEMENT_ERROR', error: error.message })
    }
    if (error instanceof TtsProviderError) {
      console.error(
        JSON.stringify({
          event: 'tts_synthesis_failed',
          language,
          providerCode: error.code,
          retryable: error.retryable,
        }),
      )
      return res.status(503).json({
        code: 'TTS_PROVIDER_UNAVAILABLE',
        error:
          error.code === 'TTS_TIMEOUT'
            ? 'Generarea audio a durat prea mult. Textul rămâne disponibil; încearcă din nou.'
            : 'Serviciul audio nu este disponibil momentan. Textul rămâne disponibil; încearcă din nou.',
      })
    }
    console.error(JSON.stringify({ event: 'tts_unexpected_failure', language }))
    return res.status(500).json({
      code: 'INTERNAL_ERROR',
      error: 'A apărut o eroare neașteptată. Textul rămâne disponibil; încearcă din nou.',
    })
  }
}
