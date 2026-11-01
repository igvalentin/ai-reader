import { MainScreenLayout } from '../components/templates/MainScreenLayout'
import { ReaderCard } from '../components/organisms/ReaderCard'
import { SubscriptionPlans } from '../components/organisms/SubscriptionPlans'
import { AuthPanel } from '../components/molecules/AuthPanel'
import { InstallHelp } from '../components/molecules/InstallHelp'

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
      <InstallHelp />

      <SubscriptionPlans />
    </MainScreenLayout>
  )
}
