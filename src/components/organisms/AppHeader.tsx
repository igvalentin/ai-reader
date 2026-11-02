export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border/80 bg-surface/95 backdrop-blur">
      <div className="mx-auto flex min-h-14 max-w-3xl items-center justify-between gap-3 px-4 py-2 sm:min-h-16 sm:px-6">
        <a href="/" className="shrink-0 font-display text-xl font-semibold text-ink">
          Citește-mi
        </a>
        <nav aria-label="Navigare principală">
          <ul className="flex items-center gap-1 text-sm font-medium sm:gap-3">
            <li>
              <a
                href="#abonament"
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-ink-muted hover:bg-teal-soft hover:text-teal"
              >
                Planuri
              </a>
            </li>
            <li>
              <a
                href="#cont"
                className="inline-flex min-h-11 items-center rounded-lg bg-teal px-3 text-white hover:bg-teal/90"
              >
                Cont
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
