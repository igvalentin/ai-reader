const DEFAULT_MAX_CHARACTERS = 4500

function splitSentences(text: string): string[] {
  return text.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)?.map((part) => part.trim()).filter(Boolean) ?? []
}

export function chunkText(text: string, maxCharacters = DEFAULT_MAX_CHARACTERS): string[] {
  if (!Number.isInteger(maxCharacters) || maxCharacters < 1) throw new Error('Dimensiune invalidă pentru fragment.')
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .flatMap((paragraph) => {
      const sentences = splitSentences(paragraph)
      const chunks: string[] = []
      let current = ''
      for (const sentence of sentences.length > 0 ? sentences : [paragraph]) {
        if (sentence.length > maxCharacters) {
          if (current) chunks.push(current)
          for (let index = 0; index < sentence.length; index += maxCharacters) chunks.push(sentence.slice(index, index + maxCharacters).trim())
          current = ''
        } else if (!current) current = sentence
        else if (current.length + sentence.length + 1 <= maxCharacters) current += ` ${sentence}`
        else {
          chunks.push(current)
          current = sentence
        }
      }
      if (current) chunks.push(current)
      return chunks
    })
}
