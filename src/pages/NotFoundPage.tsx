import { Link } from 'react-router-dom'
import { MainScreenLayout } from '../components/templates/MainScreenLayout'

export default function NotFoundPage() {
  return (
    <MainScreenLayout>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <h1 className="font-display text-3xl text-ink">Pagina nu a fost găsită</h1>
        <p className="max-w-sm text-ink-muted">
          Ne pare rău, pagina pe care o cauți nu există sau a fost mutată.
        </p>
        <Link
          to="/"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-teal hover:bg-teal-soft"
        >
          Înapoi la pagina principală
        </Link>
      </div>
    </MainScreenLayout>
  )
}
