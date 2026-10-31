import type { ReactNode } from "react";

/**
 * Secțiune de text pentru paginile publice statice (Termeni și condiții,
 * Despre noi). Titlu semantic + conținut lizibil, responsive și
 * mobile‑first, folosind exclusiv token-urile de design ale platformei.
 */
export function ProseSection({
  title,
  children,
  id,
}: {
  title: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
        {title}
      </h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
