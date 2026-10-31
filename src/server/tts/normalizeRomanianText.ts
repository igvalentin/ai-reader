const ABBREVIATIONS: ReadonlyArray<[RegExp, string]> = [
  [/\bdr\./giu, 'doctor'],
  [/\bdl\./giu, 'domnul'],
  [/\bdna\./giu, 'doamna'],
  [/\bș\.a\.m\.d\./giu, 'și așa mai departe'],
  [/\betc\./giu, 'etcetera'],
]

const ACRONYMS: ReadonlyArray<[RegExp, string]> = [
  [/\bUE\b/g, 'Uniunea Europeană'],
  [/\bONU\b/g, 'Organizația Națiunilor Unite'],
  [/\bTVA\b/g, 't v a'],
  [/\bANAF\b/g, 'a n a f'],
]

function replaceUrlsAndEmails(text: string): string {
  return text
    .replace(/https?:\/\/[^\s]+/giu, ' link web ')
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/giu, ' adresă de e-mail ')
}

function replaceNumbers(text: string): string {
  return text.replace(/\b\d+(?:[.,]\d+)?\b/g, (match) => {
    const normalized = match.replace(',', '.')
    return normalized.includes('.') ? normalized.replace('.', ' virgulă ') : normalized
  })
}

export function normalizeRomanianText(text: string, language = 'ro-RO'): string {
  if (language !== 'ro-RO') return text.replace(/\s+/g, ' ').trim()

  let normalized = replaceUrlsAndEmails(text)
  normalized = normalized.replace(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/g, '$1 slash $2 slash $3')
  normalized = normalized.replace(/(\d+(?:[.,]\d+)?)\s*%/g, '$1 la sută')
  normalized = normalized.replace(/(\d+(?:[.,]\d+)?)\s*(lei|ron|€|eur|euro|\$|usd)\b/giu, '$1 lei')
  normalized = replaceNumbers(normalized)

  for (const [pattern, replacement] of ABBREVIATIONS) normalized = normalized.replace(pattern, replacement)
  for (const [pattern, replacement] of ACRONYMS) normalized = normalized.replace(pattern, replacement)

  return normalized
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()
}
