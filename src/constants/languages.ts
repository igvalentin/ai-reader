export interface SupportedLanguage {
  readonly value: string
  readonly label: string
}

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  { value: 'ro', label: 'Română' },
  { value: 'en', label: 'Engleză' },
  { value: 'fr', label: 'Franceză' },
  { value: 'de', label: 'Germană' },
]
