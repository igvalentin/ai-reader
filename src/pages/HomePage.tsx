import { useCallback, useState } from 'react'
import { MainScreenLayout } from '../components/templates/MainScreenLayout'
import { ReaderCard } from '../components/organisms/ReaderCard'
import { SubscriptionPlans } from '../components/organisms/SubscriptionPlans'
import type { SubscriptionStatus } from '../lib/billing/billingClient'
import { SUBSCRIPTION_PLANS } from '../constants/subscriptionPlans'
import { AuthPanel } from '../components/molecules/AuthPanel'
import { InstallHelp } from '../components/molecules/InstallHelp'

const STATUS_DATE_FORMATTER = new Intl.DateTimeFormat('ro-RO', { dateStyle: 'long' })

export default function HomePage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  const [paywallRequired, setPaywallRequired] = useState(false)

  const handleUserChange = useCallback((email: string | null) => setUserEmail(email), [])
  const handlePaywallChange = useCallback((required: boolean) => setPaywallRequired(required), [])
  const handleSubscriptionChange = useCallback(
    (nextSubscription: SubscriptionStatus | null, loading: boolean) => {
      setSubscription(nextSubscription)
      setSubscriptionLoading(loading)
      if (nextSubscription?.active) setPaywallRequired(false)
    },
    [],
  )

  const activePlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === subscription?.planId)
  const expiryTimestamp = subscription?.currentPeriodEnd
    ? Date.parse(subscription.currentPeriodEnd)
    : Number.NaN
  const expiryDate = Number.isFinite(expiryTimestamp)
    ? STATUS_DATE_FORMATTER.format(new Date(expiryTimestamp))
    : 'indisponibilă'
  const isPaymentStep = paywallRequired && !subscription?.active

  const readerSection = (
    <div key="reader">
      <ReaderCard
        onPaywallChange={handlePaywallChange}
        subscriptionActive={subscription?.active === true}
      />
    </div>
  )
  const subscriptionSection = (
    <div key="subscription">
      <SubscriptionPlans
        emphasized={isPaymentStep}
        onStatusChange={handleSubscriptionChange}
      />
    </div>
  )
  const accountSection = (
    <section
      key="account"
      id="cont"
      aria-labelledby="account-heading"
      className="flex flex-col gap-3"
    >
      <h2 id="account-heading" className="font-display text-xl text-ink">
        Cont și ajutor
      </h2>
      <AuthPanel onUserChange={handleUserChange} />
      <InstallHelp />
    </section>
  )
  const orderedSections = isPaymentStep
    ? [subscriptionSection, accountSection, readerSection]
    : [readerSection, subscriptionSection, accountSection]

  return (
    <MainScreenLayout>
      <section id="cum-functioneaza" className="flex flex-col gap-2 text-left">
        <h1 className="max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
          Ascultă orice text, cu propria ta voce digitală
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-ink-muted">
          Lipește un text sau încarcă o imagine. Citește-mi îl transformă în audio, în română și în
          alte limbi.
        </p>
      </section>

      <section
        role="status"
        aria-label="Statusul accesului la lectură"
        aria-live="polite"
        className={`rounded-xl px-4 py-3 text-sm ${
          paywallRequired && !subscription?.active
            ? 'bg-accent/20 text-ink'
            : subscription?.active
              ? 'bg-teal-soft text-ink'
              : 'bg-surface text-ink-muted'
        }`}
      >
        {paywallRequired && !subscription?.active ? (
          <p>
            <strong>Abonament necesar.</strong> Lectura gratuită a fost folosită. Alege un plan pentru
            a continua.
          </p>
        ) : subscription?.active ? (
          <p>
            <strong>Abonament activ · {activePlan?.label ?? 'Plan activ'}.</strong> Accesul este
            valabil până la {expiryDate}.
          </p>
        ) : userEmail ? (
          <p>
            <strong>Conectat ca {userEmail}.</strong>{' '}
            {subscriptionLoading
              ? 'Verificăm statusul abonamentului…'
              : 'Prima lectură reușită este gratuită; accesul este verificat în siguranță la fiecare solicitare.'}
          </p>
        ) : (
          <p>
            <strong>Prima lectură reușită este gratuită.</strong> Nu ai nevoie de cont ca să începi.
          </p>
        )}
      </section>

      <div className="flex flex-col gap-5">{orderedSections}</div>
    </MainScreenLayout>
  )
}
