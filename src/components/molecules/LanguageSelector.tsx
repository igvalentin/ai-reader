import { SUPPORTED_LANGUAGES } from '../../constants/languages'

interface LanguageSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="language-selector" className="text-sm font-medium text-ink">
        Limba lecturii
      </label>
      <select
        id="language-selector"
        name="language"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby="language-selector-hint"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <option key={language.value} value={language.value}>
            {language.label}
          </option>
        ))}
      </select>
      <span id="language-selector-hint" className="text-xs text-ink-muted">
        Detectarea automată poate fi înlocuită cu o limbă preferată.
      </span>
    </div>
  )
}
