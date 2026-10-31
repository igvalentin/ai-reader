export function AppHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
        <a href="/" className="font-display text-xl font-semibold text-ink">
          Citește-mi
        </a>
        <nav aria-label="Navigare principală">
          <ul className="flex items-center gap-5 text-sm font-medium text-ink-muted">
            <li>
              <a href="#cum-functioneaza" className="hover:text-teal">
                Cum funcționează
              </a>
            </li>
            <li>
              <a href="#abonament" className="hover:text-teal">
                Abonament
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
