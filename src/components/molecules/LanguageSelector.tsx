import { SUPPORTED_LANGUAGES } from '../../constants/languages'

export function LanguageSelector() {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="language-selector" className="text-sm font-medium text-ink">
        Limba lectură
      </label>
      <select
        id="language-selector"
        name="language"
        disabled
        defaultValue="ro"
        aria-describedby="language-selector-hint"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <option key={language.value} value={language.value}>
            {language.label}
          </option>
        ))}
      </select>
      <span id="language-selector-hint" className="text-xs text-ink-muted">
        Selecția limbii va fi activă odată cu lansarea funcției de citire.
      </span>
    </div>
  )
}
