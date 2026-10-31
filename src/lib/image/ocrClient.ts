export interface OcrSuccessResponse {
  text: string
}

interface OcrErrorResponse {
  error?: string
}

export interface UploadImageForOcrOptions {
  onUploadProgress?: (percent: number) => void
  signal?: AbortSignal
}

export class OcrRequestError extends Error {}

const DEFAULT_ERROR_MESSAGE = 'Extragerea textului din imagine a eșuat. Încearcă din nou.'

/**
 * Trimite imaginea către endpoint-ul server-side `/api/ocr` folosind `multipart/form-data` și
 * raportează progresul încărcării prin `XMLHttpRequest` (nesuportat de `fetch`). Serverul
 * procesează imaginea tranzitoriu și nu o stochează.
 */
export function uploadImageForOcr(
  file: File,
  options: UploadImageForOcrOptions = {},
): Promise<OcrSuccessResponse> {
  const { onUploadProgress, signal } = options

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('image', file)

    xhr.open('POST', '/api/ocr')

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onUploadProgress) {
        onUploadProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      let payload: unknown = null
      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : null
      } catch {
        reject(new OcrRequestError('Răspuns invalid de la serverul de recunoaștere text.'))
        return
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload as OcrSuccessResponse)
        return
      }

      const errorPayload = payload as OcrErrorResponse | null
      reject(new OcrRequestError(errorPayload?.error ?? DEFAULT_ERROR_MESSAGE))
    }

    xhr.onerror = () => {
      reject(new OcrRequestError('Conexiunea a eșuat în timpul încărcării imaginii.'))
    }

    xhr.onabort = () => {
      reject(new OcrRequestError('Încărcarea imaginii a fost anulată.'))
    }

    if (signal) {
      if (signal.aborted) {
        xhr.abort()
      } else {
        signal.addEventListener('abort', () => xhr.abort())
      }
    }

    xhr.send(formData)
  })
}
