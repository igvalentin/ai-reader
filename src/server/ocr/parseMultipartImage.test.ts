import { describe, expect, it } from 'vitest'
import { Readable } from 'node:stream'
import { parseMultipartImage, MultipartParseError } from './parseMultipartImage'

const boundary = 'reader-ocr-boundary'
const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function makeRequest(parts: Buffer[]): Readable {
  return Readable.from([Buffer.concat(parts)])
}

function filePart(fieldName = 'image'): Buffer[] {
  return [
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="photo.png"\r\nContent-Type: image/png\r\n\r\n`,
    ),
    pngBytes,
    Buffer.from('\r\n'),
  ]
}

function fieldPart(name: string, value: string): Buffer[] {
  return [
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
    ),
  ]
}

function finishMultipart(): Buffer {
  return Buffer.from(`--${boundary}--\r\n`)
}

describe('parseMultipartImage', () => {
  it('accepts exactly one image in the expected image field', async () => {
    const request = makeRequest([...filePart(), finishMultipart()])
    const parsed = await parseMultipartImage(
      request as never,
      `multipart/form-data; boundary=${boundary}`,
    )

    expect(parsed.fieldName).toBe('image')
    expect(parsed.buffer).toEqual(pngBytes)
  })

  it('rejects files sent under a different field name', async () => {
    const request = makeRequest([...filePart('attachment'), finishMultipart()])

    await expect(
      parseMultipartImage(request as never, `multipart/form-data; boundary=${boundary}`),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rejects extra non-file form fields instead of parsing an unbounded multipart body', async () => {
    const request = makeRequest([
      ...filePart(),
      ...fieldPart('unexpected', 'value'),
      finishMultipart(),
    ])

    await expect(
      parseMultipartImage(request as never, `multipart/form-data; boundary=${boundary}`),
    ).rejects.toBeInstanceOf(MultipartParseError)
  })
})
