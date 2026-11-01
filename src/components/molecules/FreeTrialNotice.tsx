export function FreeTrialNotice() {
  return (
    <aside
      className="rounded-lg border border-teal-soft bg-teal-soft/60 px-4 py-3 text-sm text-ink"
      aria-label="Regula lecturii gratuite și confidențialitate"
    >
      <strong>O lectură gratuită pentru început.</strong> Se consumă numai după ce serverul
      generează audio cu succes. Lecturile următoare necesită un abonament. Pentru vizitatorii
      anonimi folosim un cookie securizat, valabil cel mult 12 luni, și un identificator
      pseudonimizat pentru a păstra limita gratuită și contoarele de utilizare; nu stocăm textul
      introdus, imaginile sau fișierele audio.
    </aside>
  )
}
