export function PaywallNotice() {
  return (
    <section
      aria-labelledby="paywall-title"
      className="rounded-xl border border-accent/60 bg-accent/10 p-4"
    >
      <h2 id="paywall-title" className="font-display text-xl">
        Lectura gratuită a fost folosită
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        Pentru a genera alte lecturi, alege un plan. Accesul este verificat de server și se
        activează după confirmarea plății de către Stripe.
      </p>
      <a
        href="#abonament"
        className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-accent px-5 py-3 text-base font-medium text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      >
        Vezi planurile și prețurile
      </a>
    </section>
  )
}
