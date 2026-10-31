export function ImageUploadControl() {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="image-upload" className="text-sm font-medium text-ink">
        Încarcă o imagine cu text
      </label>
      <label
        htmlFor="image-upload"
        className="flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-ink-muted opacity-70"
      >
        <span aria-hidden="true">🖼️</span>
        <span>Trage o imagine aici sau apasă pentru a o selecta</span>
      </label>
      <input
        id="image-upload"
        name="image"
        type="file"
        accept="image/*"
        disabled
        className="sr-only"
      />
      <span className="text-xs text-ink-muted">
        Disponibil în curând: extragerea automată a textului din imagini.
      </span>
    </div>
  )
}
