import { MainScreenLayout } from '../components/templates/MainScreenLayout'
import { ReaderCard } from '../components/organisms/ReaderCard'
import { AuthPanel } from '../components/molecules/AuthPanel'

export default function HomePage() {
  return (
    <MainScreenLayout>
      <section id="cum-functioneaza" className="flex flex-col gap-3 text-center sm:text-left">
        <h1 className="font-display text-3xl leading-tight sm:text-4xl">
          Ascultă orice text, cu propria ta voce digitală
        </h1>
        <p className="text-base text-ink-muted">
          Scrie, lipește sau încarcă o imagine cu text, iar Citește-mi ți-l citește cu voce tare, în
          română sau în alte limbi.
        </p>
      </section>

      <AuthPanel />
      <ReaderCard />

      <section
        id="abonament"
        className="rounded-2xl border border-border bg-surface p-5 text-sm text-ink-muted sm:p-6"
      >
        <h2 className="mb-2 font-display text-lg text-ink">Despre abonament</h2>
        <p>
          Prima lectură reușită este gratuită, fără înregistrare. După aceea, abonamentul oferă
          lecturi audio nelimitate în limbile disponibile. Prețul și intervalul de facturare sunt
          configurabile și afișate de Stripe înainte de confirmare. Autentifică-te pentru a activa,
          restaura sau anula abonamentul.
        </p>
      </section>
    </MainScreenLayout>
  )
}
