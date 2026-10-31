export function AudioPlayerPlaceholder() {
  return (
    <div
      role="group"
      aria-label="Player audio"
      className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3"
    >
      <button
        type="button"
        disabled
        aria-label="Redă lectura"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-border text-ink-muted disabled:cursor-not-allowed"
      >
        <span aria-hidden="true">▶</span>
      </button>
      <div className="flex flex-1 items-center gap-2" aria-hidden="true">
        {Array.from({ length: 24 }).map((_, index) => (
          <span
            key={index}
            className="w-1 rounded-full bg-border"
            style={{ height: `${8 + ((index * 7) % 20)}px` }}
          />
        ))}
      </div>
      <span className="shrink-0 text-xs tabular-nums text-ink-muted">0:00 / 0:00</span>
    </div>
  )
}
