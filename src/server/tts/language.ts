const ROMANIAN_MARKERS = /[ăâîșşțţ]/iu
const ROMANIAN_WORDS = /\b(și|sau|este|pentru|din|cu|în|că|nu|un|o|text)\b/iu
const ENGLISH_WORDS = /\b(the|and|or|is|for|with|this|that|not|text)\b/iu

export type SupportedTtsLanguage = 'ro-RO' | 'en-US' | 'en-GB'

export function detectLanguage(text: string): SupportedTtsLanguage {
  if (ROMANIAN_MARKERS.test(text) || ROMANIAN_WORDS.test(text)) return 'ro-RO'
  if (ENGLISH_WORDS.test(text)) return 'en-US'
  return 'ro-RO'
}

export function normalizeLanguage(value: unknown): SupportedTtsLanguage {
  if (value === 'ro' || value === 'ro-RO') return 'ro-RO'
  if (value === 'en-GB') return 'en-GB'
  return 'en-US'
}
