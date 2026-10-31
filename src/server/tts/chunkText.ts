const DEFAULT_MAX_CHARACTERS = 4500

function splitSentences(text: string): string[] {
  return text.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)?.map((part) => part.trim()).filter(Boolean) ?? []
}

function splitByUtf8Bytes(text: string, maxBytes: number): string[] {
  const chunks: string[] = []
  let current = ''
  let currentBytes = 0

  for (const character of text) {
    const characterBytes = Buffer.byteLength(character, 'utf8')
    if (currentBytes + characterBytes > maxBytes && current) {
      chunks.push(current)
      current = ''
      currentBytes = 0
    }
    current += character
    currentBytes += characterBytes
  }

  if (current) chunks.push(current)
  return chunks
}

export function chunkText(text: string, maxCharacters = DEFAULT_MAX_CHARACTERS): string[] {
  if (!Number.isInteger(maxCharacters) || maxCharacters < 1) throw new Error('Dimensiune invalidă pentru fragment.')
  return text
    .replace(/\n\s*\n/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .flatMap((paragraph) => {
      const sentences = splitSentences(paragraph)
      const chunks: string[] = []
      let current = ''
      for (const sentence of sentences.length > 0 ? sentences : [paragraph]) {
        if (Buffer.byteLength(sentence, 'utf8') > maxCharacters) {
          if (current) chunks.push(current)
          chunks.push(...splitByUtf8Bytes(sentence, maxCharacters))
          current = ''
        } else if (!current) current = sentence
        else if (Buffer.byteLength(`${current} ${sentence}`, 'utf8') <= maxCharacters) current += ` ${sentence}`
        else {
          chunks.push(current)
          current = sentence
        }
      }
      if (current) chunks.push(current)
      return chunks
    })
}
