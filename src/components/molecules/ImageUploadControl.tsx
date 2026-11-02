import { useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Button } from '../atoms/Button'
import type { ImageOcrStatus } from '../../lib/image/useImageOcr'

interface ImageUploadControlProps {
  previewUrl: string | null
  status: ImageOcrStatus
  errorMessage: string | null
  uploadProgress: number
  onFileSelected: (file: File) => void
  onRemove: () => void
  onStartOcr: () => void
}

const BUSY_STATUSES: readonly ImageOcrStatus[] = ['uploading', 'processing']

function statusLabel(status: ImageOcrStatus, uploadProgress: number): string | null {
  switch (status) {
    case 'uploading':
      return `Se încărcă imaginea… ${uploadProgress}%`
    case 'processing':
      return 'Se extrage textul din imagine…'
    case 'success':
      return 'Text extras cu succes. Poți să-l corectezi mai jos.'
    default:
      return null
  }
}

/**
 * Control de încărcare imagine cu selectare prin click sau tragere-și-plasare (drag & drop),
 * previzualizare, stare de progres încărcare/procesare OCR, eliminare/înlocuire și declanșare
 * manuală a extragerii textului. Validarea fișierului (tip MIME, dimensiune, semnătură binară)
 * este făcută de hook-ul `useImageOcr` care consumă acest control.
 */
export function ImageUploadControl({
  previewUrl,
  status,
  errorMessage,
  uploadProgress,
  onFileSelected,
  onRemove,
  onStartOcr,
}: ImageUploadControlProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const inputId = useId()
  const statusId = useId()
  const errorId = useId()

  const isBusy = BUSY_STATUSES.includes(status)
  const hasImage = Boolean(previewUrl)
  const currentStatusLabel = statusLabel(status, uploadProgress)

  const handleFiles = (fileList: FileList | null) => {
    const file = fileList?.[0]
    if (file) {
      onFileSelected(file)
    }
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files)
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setIsDragActive(false)
    if (isBusy) return
    handleFiles(event.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">Încarcă o imagine cu text</span>

      {hasImage ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
          <div className="flex items-start gap-3">
            <img
              src={previewUrl ?? undefined}
              alt="Previzualizare imagine încărcată"
              className="h-24 w-24 shrink-0 rounded-md border border-border object-cover"
            />
            <div className="flex flex-1 flex-col gap-2">
              {currentStatusLabel ? (
                <p
                  id={statusId}
                  role="status"
                  aria-live="polite"
                  className="text-sm text-ink-muted"
                >
                  {currentStatusLabel}
                </p>
              ) : null}

              {status === 'uploading' ? (
                <div
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progres încărcare imagine"
                  className="h-1.5 w-full overflow-hidden rounded-full bg-border"
                >
                  <div
                    className="h-full rounded-full bg-teal transition-[width] duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={onStartOcr}
                  disabled={isBusy || status === 'success'}
                  aria-describedby={currentStatusLabel ? statusId : undefined}
                >
                  <span aria-hidden="true">🔎</span>
                  {status === 'success' ? 'Text extras' : 'Extrage textul'}
                </Button>
                <Button type="button" variant="secondary" onClick={onRemove} disabled={isBusy}>
                  Elimină imaginea
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => inputRef.current?.click()}
                  disabled={isBusy}
                >
                  Înlocuiește imaginea
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragActive(true)
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={handleDrop}
          className={`flex min-h-20 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-4 text-center transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
            isDragActive
              ? 'border-teal bg-teal-soft/60 text-ink'
              : 'border-border bg-paper text-ink'
          }`}
        >
          <span className="font-semibold">Încarcă o imagine</span>
          <span className="text-sm text-ink-muted">Alege o fotografie sau trage-o aici</span>
        </button>
      )}

      <input
        ref={inputRef}
        id={inputId}
        name="image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        aria-hidden="true"
        tabIndex={-1}
        className="hidden"
      />

      {errorMessage ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger">
          {errorMessage}
        </p>
      ) : (
        <span className="text-xs text-ink-muted">
          Formate acceptate: JPEG, PNG, WebP. Dimensiune maximă 4 MB.
        </span>
      )}
    </div>
  )
}
