import { Fragment, useEffect, useState, type FormEvent } from 'react'
import { MainScreenLayout } from '../components/templates/MainScreenLayout'
import { Button } from '../components/atoms/Button'
import { getAccessToken } from '../lib/auth/authClient'
import { SUBSCRIPTION_PLANS } from '../constants/subscriptionPlans'

interface AdminUserRow {
  id: string
  category: 'anonymous' | 'registered-unpaid' | 'subscribers'
  userId: string | null
  email: string | null
  anonymousId: string | null
  firstSeen: string | null
  lastActivity: string | null
  ocrAttempts: number
  audioAttempts: number
  successfulAudioGenerations: number
  freeReadingConsumed: boolean
  planId: string | null
  subscriptionStatus: string | null
  subscriptionStart: string | null
  subscriptionExpiry: string | null
  providerCustomerId: string | null
}

interface AdminUsersResponse {
  rows: AdminUserRow[]
  total: number
  page: number
  pageSize: number
  summary: { anonymousVisitors: number; registeredUnpaid: number; subscribers: number }
}

const CATEGORY_LABELS: Record<AdminUserRow['category'], string> = {
  anonymous: 'Vizitator anonim',
  'registered-unpaid': 'Utilizator înregistrat',
  subscribers: 'Abonat',
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function planLabel(planId: string | null): string {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId)?.label ?? '—'
}

export default function AdminUsersPage() {
  const [token, setToken] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<'all' | AdminUserRow['category']>('all')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [data, setData] = useState<AdminUsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void getAccessToken().then((accessToken) => {
      if (!active) return
      setToken(accessToken)
      setAuthReady(true)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!authReady || !token) return
    const controller = new AbortController()
    const params = new URLSearchParams({
      category,
      search,
      page: String(page),
      pageSize: '50',
    })
    void fetch(`/api/admin/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          (AdminUsersResponse & { code?: string; error?: string }) | null
        if (!response.ok) {
          if (response.status === 403)
            throw new Error('Accesul este permis doar administratorilor autorizați.')
          if (response.status === 401)
            throw new Error('Sesiunea a expirat. Autentifică-te din nou.')
          throw new Error(payload?.error ?? 'Datele nu au putut fi încărcate.')
        }
        if (!payload) throw new Error('Răspuns invalid de la server.')
        setData(payload)
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Datele nu au putut fi încărcate.',
          )
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [authReady, token, category, search, page, reloadKey])

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setPage(1)
    setSearch(searchDraft.trim())
    setReloadKey((current) => current + 1)
  }

  if (!authReady) {
    return (
      <MainScreenLayout>
        <p role="status">Se verifică accesul…</p>
      </MainScreenLayout>
    )
  }
  if (!token) {
    return (
      <MainScreenLayout>
        <section className="rounded-xl border border-border bg-surface p-5">
          <h1 className="font-display text-2xl">Administrare</h1>
          <p className="mt-2 text-ink-muted">
            Autentifică-te cu un cont de administrator autorizat.
          </p>
          <a href="/" className="mt-4 inline-block text-teal underline">
            Înapoi la aplicație
          </a>
        </section>
      </MainScreenLayout>
    )
  }

  return (
    <MainScreenLayout>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink">Utilizatori și utilizare</h1>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            Sunt afișate doar date de utilizare agregate. Textul OCR, textul introdus și fișierele
            audio nu sunt stocate.
          </p>
        </div>
        <a href="/" className="text-sm font-medium text-teal underline">
          Înapoi la aplicație
        </a>
      </header>

      {data ? (
        <section aria-label="Rezumat utilizatori" className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm text-ink-muted">Vizitatori anonimi</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{data.summary.anonymousVisitors}</p>
          </article>
          <article className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm text-ink-muted">Înregistrați, fără abonament activ</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{data.summary.registeredUnpaid}</p>
          </article>
          <article className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm text-ink-muted">Abonați activi</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{data.summary.subscribers}</p>
          </article>
        </section>
      ) : null}

      <form
        onSubmit={submitSearch}
        className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row"
      >
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium text-ink">
          Caută după email sau identificator
          <input
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            className="rounded-lg border border-border bg-paper px-3 py-2 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink">
          Categorie
          <select
            value={category}
            onChange={(event) => {
              setLoading(true)
              setError(null)
              setCategory(event.target.value as typeof category)
              setPage(1)
            }}
            className="rounded-lg border border-border bg-paper px-3 py-2 text-ink"
          >
            <option value="all">Toți</option>
            <option value="anonymous">Vizitatori anonimi</option>
            <option value="registered-unpaid">Înregistrați, fără abonament activ</option>
            <option value="subscribers">Abonați</option>
          </select>
        </label>
        <Button type="submit" variant="secondary" className="self-end">
          Caută
        </Button>
      </form>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}
      {loading ? (
        <p role="status" className="text-sm text-ink-muted">
          Se încarcă utilizatorii…
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
          <caption className="sr-only">Utilizatori și activitate</caption>
          <thead className="border-b border-border bg-paper text-ink-muted">
            <tr>
              <th scope="col" className="p-3">
                Utilizator
              </th>
              <th scope="col" className="p-3">
                Categorie
              </th>
              <th scope="col" className="p-3">
                Prima activitate
              </th>
              <th scope="col" className="p-3">
                Ultima activitate
              </th>
              <th scope="col" className="p-3">
                Încercări OCR
              </th>
              <th scope="col" className="p-3">
                Încercări audio
              </th>
              <th scope="col" className="p-3">
                Lecturi reușite
              </th>
              <th scope="col" className="p-3">
                Lectură gratuită
              </th>
              <th scope="col" className="p-3">
                Plan / expirare
              </th>
              <th scope="col" className="p-3">
                Detalii
              </th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows ?? []).map((row) => (
              <Fragment key={row.id}>
                <tr className="border-b border-border align-top">
                  <td className="p-3">
                    <span className="block font-medium text-ink">
                      {row.email ?? `Anonim ${row.anonymousId?.slice(0, 10) ?? '—'}`}
                    </span>
                    <span className="block max-w-52 truncate text-xs text-ink-muted">
                      {row.userId ?? 'Identificator pseudonimizat'}
                    </span>
                  </td>
                  <td className="p-3">{CATEGORY_LABELS[row.category]}</td>
                  <td className="p-3">{formatDate(row.firstSeen)}</td>
                  <td className="p-3">{formatDate(row.lastActivity)}</td>
                  <td className="p-3">{row.ocrAttempts}</td>
                  <td className="p-3">{row.audioAttempts}</td>
                  <td className="p-3">{row.successfulAudioGenerations}</td>
                  <td className="p-3">{row.freeReadingConsumed ? 'Folosită' : 'Disponibilă'}</td>
                  <td className="p-3">
                    {planLabel(row.planId)}
                    {row.subscriptionExpiry ? (
                      <span className="block text-xs text-ink-muted">
                        Până la {formatDate(row.subscriptionExpiry)}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                      aria-expanded={expandedId === row.id}
                    >
                      {expandedId === row.id ? 'Închide' : 'Deschide'}
                    </Button>
                  </td>
                </tr>
                {expandedId === row.id ? (
                  <tr className="border-b border-border bg-paper/70">
                    <td colSpan={10} className="p-4">
                      <dl className="grid gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="text-ink-muted">ID utilizator</dt>
                          <dd className="break-all">{row.userId ?? 'Anonim'}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-muted">Status abonament</dt>
                          <dd>{row.subscriptionStatus ?? 'Fără abonament'}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-muted">Început / expirare</dt>
                          <dd>
                            {formatDate(row.subscriptionStart)} /{' '}
                            {formatDate(row.subscriptionExpiry)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-ink-muted">Customer Stripe</dt>
                          <dd className="break-all">{row.providerCustomerId ?? '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-muted">ID anonim (hash)</dt>
                          <dd className="break-all">{row.anonymousId ?? '—'}</dd>
                        </div>
                      </dl>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
            {!loading && data?.rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-ink-muted">
                  Nu există rezultate pentru filtrele selectate.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <nav aria-label="Paginare utilizatori" className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">{data ? `${data.total} rezultate` : '—'}</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={page <= 1 || loading}
            onClick={() => {
              setLoading(true)
              setPage((current) => current - 1)
            }}
          >
            Pagina anterioară
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!data || page * data.pageSize >= data.total || loading}
            onClick={() => {
              setLoading(true)
              setPage((current) => current + 1)
            }}
          >
            Pagina următoare
          </Button>
        </div>
      </nav>
    </MainScreenLayout>
  )
}
