export interface SupportedLanguage {
  readonly value: string
  readonly label: string
}

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  { value: 'auto', label: 'Detectare automată' },
  { value: 'ro-RO', label: 'Română' },
  { value: 'en-US', label: 'Engleză (SUA)' },
  { value: 'en-GB', label: 'Engleză (Marea Britanie)' },
]
