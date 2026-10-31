interface SpinnerProps {
  label?: string
}

export function Spinner({ label = 'Se încarcă' }: SpinnerProps) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-10 text-ink-muted">
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-teal"
      />
      <span className="text-sm">{label}…</span>
    </div>
  )
}
