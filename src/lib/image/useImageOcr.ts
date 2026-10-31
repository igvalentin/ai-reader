import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { validateImageFile } from './validateImageFile'
import { uploadImageForOcr } from './ocrClient'

export type ImageOcrStatus =
  'idle' | 'invalid' | 'ready' | 'uploading' | 'processing' | 'success' | 'error'

export interface UseImageOcrOptions {
  onTextExtracted: (text: string) => void
}

export interface UseImageOcrResult {
  file: File | null
  previewUrl: string | null
  status: ImageOcrStatus
  errorMessage: string | null
  uploadProgress: number
  selectFile: (file: File) => Promise<void>
  removeImage: () => void
  startOcr: () => Promise<void>
}

/**
 * Gestionează întregul ciclu de viață al imaginii pentru OCR: selectare/validare, previzualizare
 * (cu eliberarea corectă a URL-ului obiect la înlocuire/demontare), încărcare cu progres și
 * extragerea textului. Textul extras este livrat prin `onTextExtracted`, rămânând complet
 * editabil în componenta părinte.
 */
export function useImageOcr({ onTextExtracted }: UseImageOcrOptions): UseImageOcrResult {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<ImageOcrStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const previewUrlRef = useRef<string | null>(null)

  useEffect(() => {
    previewUrlRef.current = previewUrl
  }, [previewUrl])

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  const releasePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
  }, [])

  const selectFile = useCallback(
    async (nextFile: File) => {
      releasePreview()
      setErrorMessage(null)
      setUploadProgress(0)

      const validation = await validateImageFile(nextFile)

      if (!validation.valid) {
        setFile(null)
        setPreviewUrl(null)
        setStatus('invalid')
        setErrorMessage(validation.error ?? 'Imagine invalidă.')
        return
      }

      const nextPreviewUrl = URL.createObjectURL(nextFile)
      setFile(nextFile)
      setPreviewUrl(nextPreviewUrl)
      setStatus('ready')
    },
    [releasePreview],
  )

  const removeImage = useCallback(() => {
    releasePreview()
    setFile(null)
    setPreviewUrl(null)
    setStatus('idle')
    setErrorMessage(null)
    setUploadProgress(0)
  }, [releasePreview])

  const startOcr = useCallback(async () => {
    if (!file) return

    setStatus('uploading')
    setErrorMessage(null)
    setUploadProgress(0)

    try {
      // Trimitem token-ul de sesiune dacă există deja (pregătit pentru etapa de entitlement),
      // dar nu îl impunem încă — autentificarea obligatorie va fi activată odată cu ecranul de
      // login și contorizarea lecturii gratuite (docs/ARCHITECTURE.md, secțiunea 7).
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const result = await uploadImageForOcr(file, {
        accessToken: session?.access_token ?? null,
        onUploadProgress: (percent) => {
          setUploadProgress(percent)
          if (percent >= 100) {
            setStatus('processing')
          }
        },
      })

      const extracted = result.text?.trim() ?? ''

      if (extracted.length === 0) {
        setStatus('error')
        setErrorMessage('Nu am găsit text în imagine. Încearcă o imagine mai clară.')
        return
      }

      onTextExtracted(extracted)
      setStatus('success')
    } catch (error) {
      setStatus('error')
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : 'Extragerea textului din imagine a eșuat. Încearcă din nou.',
      )
    }
  }, [file, onTextExtracted])

  return {
    file,
    previewUrl,
    status,
    errorMessage,
    uploadProgress,
    selectFile,
    removeImage,
    startOcr,
  }
}
