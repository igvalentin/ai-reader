/**
 * Normalizează textul brut returnat de un furnizor OCR (de regulă o linie fizică detectată pe
 * rând) într-o formă lizibilă, cu paragrafe păstrate și o ordine de citire rezonabilă:
 * - liniile goale consecutive sunt tratate drept separator de paragraf și păstrate ca atare;
 * - liniile fără rând gol între ele (același paragraf încăpățânat pe mai multe rânduri de către
 *   motorul OCR) sunt unite cu spațiu, pentru a reface fluxul natural al propozițiilor;
 * - diacriticele (ă, â, î, ș, ț) sunt păstrate neschimbate, fără nicio transliterare.
 */
export function normalizeOcrText(rawText: string): string {
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ')
  const blocks = normalized.split(/\n\s*\n/)

  const paragraphs = blocks
    .map((block) =>
      block
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join(' ')
        .replace(/[ \t]+/g, ' ')
        .trim(),
    )
    .filter((paragraph) => paragraph.length > 0)

  return paragraphs.join('\n\n')
}
