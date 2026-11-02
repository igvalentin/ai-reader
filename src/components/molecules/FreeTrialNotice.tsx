export function FreeTrialNotice() {
  return (
    <aside
      className="rounded-xl border border-teal-soft bg-teal-soft/60 px-4 py-3 text-sm text-ink"
      aria-label="Regula lecturii gratuite și confidențialitate"
    >
      <p>
        <strong>Prima lectură gratuită se confirmă la generarea audio reușită.</strong> După aceea,
        este necesar un abonament.
      </p>
      <details className="mt-1">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm text-teal">
          Cum sunt folosite datele
        </summary>
        <p className="pb-1 text-ink-muted">
          Lectura gratuită se consumă numai după ce serverul generează audio cu succes. Pentru
          vizitatorii anonimi folosim un cookie securizat, valabil cel mult 12 luni, și un
          identificator pseudonimizat pentru a păstra limita gratuită și contoarele de utilizare;
          nu stocăm textul introdus, imaginile sau fișierele audio.
        </p>
      </details>
    </aside>
  )
}
