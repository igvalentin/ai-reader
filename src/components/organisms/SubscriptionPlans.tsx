import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  BillingRequestError,
  requestBillingPortal,
  requestCheckout,
  requestSubscriptionStatus,
  type SubscriptionStatus,
} from '../../lib/billing/billingClient'
import type { SubscriptionPlanId } from '../../lib/billing/billingClient'
import { SUBSCRIPTION_PLANS } from '../../constants/subscriptionPlans'
import { Button } from '../atoms/Button'

const DATE_FORMATTER = new Intl.DateTimeFormat('ro-RO', { dateStyle: 'long' })

function formatDate(value: string | null): string {
  if (!value) return 'Nedisponibilă'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Nedisponibilă' : DATE_FORMATTER.format(date)
}

function getPlanLabel(planId: SubscriptionPlanId | null): string {
  if (!planId) return 'Abonament existent'
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId)?.label ?? 'Abonament existent'
}

export function SubscriptionPlans() {
  const [accessToken, setAccessToken] = useState<string | null | undefined>(undefined)
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [loadingAction, setLoadingAction] = useState<SubscriptionPlanId | 'portal' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef<{ planId: SubscriptionPlanId; requestId: string } | null>(null)
  const checkoutResult = new URLSearchParams(window.location.search).get('checkout')

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token ?? null)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoadingStatus(true)
      setAccessToken(session?.access_token ?? null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (accessToken === undefined) return
    if (accessToken === null) {
      let active = true
      void Promise.resolve().then(() => {
        if (!active) return
        setSubscription(null)
        setLoadingStatus(false)
      })
      return () => {
        active = false
      }
    }

    let active = true
    void requestSubscriptionStatus(accessToken)
      .then((currentSubscription) => {
        if (!active) return
        setSubscription(currentSubscription)
        setError(null)
      })
      .catch((requestError: unknown) => {
        if (!active) return
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Statusul abonamentului nu s-a încărcat.',
        )
      })
      .finally(() => {
        if (active) setLoadingStatus(false)
      })
    return () => {
      active = false
    }
  }, [accessToken])

  const refreshSubscription = useCallback(async () => {
    if (!accessToken) return
    setLoadingStatus(true)
    try {
      setSubscription(await requestSubscriptionStatus(accessToken))
      setError(null)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Statusul abonamentului nu s-a încărcat.',
      )
    } finally {
      setLoadingStatus(false)
    }
  }, [accessToken])

  const startCheckout = async (planId: SubscriptionPlanId) => {
    if (!accessToken || loadingAction) {
      if (!accessToken) setError('Autentifică-te cu email înainte să alegi un plan.')
      return
    }
    setLoadingAction(planId)
    setError(null)
    if (!requestIdRef.current || requestIdRef.current.planId !== planId) {
      requestIdRef.current = { planId, requestId: crypto.randomUUID() }
    }
    try {
      const url = await requestCheckout(planId, requestIdRef.current.requestId, accessToken)
      window.location.assign(url)
    } catch (requestError) {
      if (
        requestError instanceof BillingRequestError &&
        requestError.code === 'SUBSCRIPTION_ACTIVE'
      ) {
        await refreshSubscription()
      }
      setError(
        requestError instanceof Error ? requestError.message : 'Checkout-ul nu a putut fi deschis.',
      )
    } finally {
      setLoadingAction(null)
    }
  }

  const openPortal = async () => {
    if (!accessToken || loadingAction) return
    setLoadingAction('portal')
    setError(null)
    try {
      window.location.assign(await requestBillingPortal(accessToken))
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Portalul nu este disponibil.',
      )
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <section
      id="abonament"
      aria-labelledby="subscription-heading"
      className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="subscription-heading" className="font-display text-xl text-ink">
            Planuri de lectură
          </h2>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            Prima lectură audio reușită este gratuită. După aceea, alege perioada potrivită.
          </p>
        </div>
        {subscription?.hasBillingAccount ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void openPortal()}
            disabled={Boolean(loadingAction)}
          >
            {loadingAction === 'portal' ? 'Se deschide…' : 'Administrează abonamentul'}
          </Button>
        ) : null}
      </div>

      {subscription ? (
        <div
          className="mt-4 rounded-lg border border-teal-soft bg-teal-soft/50 p-3 text-sm"
          aria-live="polite"
        >
          {subscription.active ? (
            <p>
              Plan activ: <strong>{getPlanLabel(subscription.planId)}</strong>. Expiră la{' '}
              <strong>{formatDate(subscription.currentPeriodEnd)}</strong>.
              {subscription.cancelAtPeriodEnd
                ? ' Reînnoirea a fost oprită.'
                : ' Reînnoire automată activă.'}
            </p>
          ) : (
            <p>Nu ai un plan activ. Lectura gratuită se aplică doar dacă nu a fost folosită.</p>
          )}
        </div>
      ) : null}
      {checkoutResult === 'success' ? (
        <div className="mt-3 flex flex-wrap items-center gap-3" role="status">
          <p className="text-sm text-ink-muted">
            Plata este în curs de confirmare. Accesul se activează numai după confirmarea Stripe.
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void refreshSubscription()}
            disabled={loadingStatus}
          >
            Verifică statusul
          </Button>
        </div>
      ) : null}
      {!accessToken ? (
        <p className="mt-4 text-sm text-ink-muted">
          Autentifică-te mai sus pentru a cumpăra sau administra un plan.
        </p>
      ) : null}
      {loadingStatus ? (
        <p className="mt-3 text-sm text-ink-muted" role="status">
          Se verifică abonamentul…
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <article key={plan.id} className="flex flex-col rounded-lg border border-border p-4">
            <h3 className="font-display text-lg text-ink">{plan.label}</h3>
            <p className="mt-2 text-2xl font-semibold text-ink">{plan.priceRon} lei</p>
            <p className="mt-2 flex-1 text-sm text-ink-muted">{plan.renewalCopy}</p>
            <Button
              type="button"
              variant="primary"
              className="mt-4 w-full"
              disabled={!accessToken || Boolean(loadingAction) || Boolean(subscription?.active)}
              onClick={() => void startCheckout(plan.id)}
            >
              {loadingAction === plan.id ? 'Se deschide checkout-ul…' : 'Alege planul'}
            </Button>
          </article>
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-4 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      <p className="mt-4 text-xs text-ink-muted">
        Plățile sunt procesate securizat de Stripe. Poți opri reînnoirea din portal; accesul rămâne
        activ până la expirarea perioadei plătite.
      </p>
    </section>
  )
}
