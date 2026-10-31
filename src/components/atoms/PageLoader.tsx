import { Spinner } from './Spinner'

export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <Spinner label="Se încarcă pagina" />
    </div>
  )
}
