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

interface SubscriptionPlansProps {
  emphasized?: boolean
  onStatusChange?: (subscription: SubscriptionStatus | null, loading: boolean) => void
}

export function SubscriptionPlans({ emphasized = false, onStatusChange }: SubscriptionPlansProps = {}) {
  const [accessToken, setAccessToken] = useState<string | null | undefined>(undefined)
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [loadingAction, setLoadingAction] = useState<SubscriptionPlanId | 'portal' | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>('30-days')
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef<{ planId: SubscriptionPlanId; requestId: string } | null>(null)
  const checkoutParams = new URLSearchParams(window.location.search)
  const checkoutResult = checkoutParams.get('checkout')
  const checkoutSessionId = checkoutResult === 'success' ? checkoutParams.get('session_id') : null
  const selectedPlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === selectedPlanId)!

  useEffect(() => {
    onStatusChange?.(subscription, loadingStatus)
  }, [loadingStatus, onStatusChange, subscription])

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
    let retryTimeout: number | undefined
    const loadSubscription = async (attempt = 0) => {
      try {
        const currentSubscription =
          attempt === 0 && checkoutSessionId
            ? await requestSubscriptionStatus(accessToken, checkoutSessionId)
            : await requestSubscriptionStatus(accessToken)
        if (!active) return
        setSubscription(currentSubscription)
        setError(null)
        if (checkoutResult === 'success' && !currentSubscription?.active && attempt < 20) {
          retryTimeout = window.setTimeout(() => void loadSubscription(attempt + 1), 1_500)
        }
      } catch (requestError: unknown) {
        if (!active) return
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Statusul abonamentului nu s-a încărcat.',
        )
      } finally {
        if (active) setLoadingStatus(false)
      }
    }

    void loadSubscription()
    return () => {
      active = false
      if (retryTimeout !== undefined) window.clearTimeout(retryTimeout)
    }
  }, [accessToken, checkoutResult, checkoutSessionId])

  const refreshSubscription = useCallback(async () => {
    if (!accessToken) return
    setLoadingStatus(true)
    try {
      setSubscription(
        checkoutSessionId
          ? await requestSubscriptionStatus(accessToken, checkoutSessionId)
          : await requestSubscriptionStatus(accessToken),
      )
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
  }, [accessToken, checkoutSessionId])

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
      className={`rounded-2xl border bg-surface p-5 sm:p-6 ${
        emphasized ? 'border-accent shadow-md' : 'border-border'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="subscription-heading" className="font-display text-xl text-ink">
            Abonament
          </h2>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            Lectura audio este gratuită la început. Alege o perioadă când ai nevoie de acces complet.
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
      {checkoutResult === 'success' && !subscription?.active ? (
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
          Autentifică-te din zona „Cont și ajutor” pentru a cumpăra sau administra un plan.
        </p>
      ) : null}
      {loadingStatus ? (
        <p className="mt-3 text-sm text-ink-muted" role="status">
          Se verifică abonamentul…
        </p>
      ) : null}

      <details open={emphasized} className="mt-4">
        <summary className="flex min-h-12 cursor-pointer items-center rounded-lg px-3 py-2 text-sm font-semibold text-teal hover:bg-teal-soft/50">
          {emphasized ? 'Alege planul potrivit' : 'Vezi planurile și prețurile'}
        </summary>
        <fieldset className="mt-3 grid gap-3 md:grid-cols-3">
          <legend className="sr-only">Alege perioada abonamentului</legend>
          {SUBSCRIPTION_PLANS.map((plan) => {
            const selected = plan.id === selectedPlanId
            return (
              <label
                key={plan.id}
                className={`flex min-h-32 cursor-pointer flex-col rounded-xl border p-4 transition-colors ${
                  selected
                    ? 'border-teal bg-teal-soft/60 ring-2 ring-teal'
                    : 'border-border hover:border-teal'
                } ${subscription?.active ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <span className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="subscription-plan"
                    value={plan.id}
                    checked={selected}
                    disabled={Boolean(loadingAction) || Boolean(subscription?.active)}
                    onChange={() => setSelectedPlanId(plan.id)}
                    className="mt-1 h-5 w-5 accent-teal"
                  />
                  <span className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-semibold text-ink">
                      {plan.label}
                    </h3>
                    <span className="mt-1 block text-2xl font-semibold text-ink">
                      {plan.priceRon} lei
                    </span>
                  </span>
                </span>
                <span className="mt-3 text-sm text-ink-muted">{plan.renewalCopy}</span>
              </label>
            )
          })}
        </fieldset>
        <Button
          type="button"
          variant="primary"
          className="mt-4 min-h-14 w-full sm:w-auto"
          disabled={!accessToken || Boolean(loadingAction) || Boolean(subscription?.active)}
          onClick={() => void startCheckout(selectedPlanId)}
        >
          {loadingAction === selectedPlanId
            ? 'Se deschide checkout-ul…'
            : `Continuă cu ${selectedPlan.label} · ${selectedPlan.priceRon} lei`}
        </Button>
      </details>
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
