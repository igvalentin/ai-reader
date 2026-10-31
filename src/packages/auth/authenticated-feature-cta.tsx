import { Link } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { useAuth } from "./use-auth";

/**
 * Card standardizat de autentificare pentru funcționalitatea extinsă
 * a calculatoarelor (salvare calcule, export PDF/Excel etc.).
 *
 * Acesta este SINGURUL CTA de autentificare afișat în calculatoare —
 * acoperă generic toate funcțiile extinse, fără copy specific unei
 * aplicații și fără referiri la Premium. Utilizatorii anonimi pot
 * folosi în continuare calculul de bază; cardul îi invită să își
 * creeze un cont gratuit pentru funcțiile extinse.
 *
 * Nu se afișează utilizatorilor autentificați.
 */
export function AuthenticatedFeatureCTA() {
  const { status } = useAuth();
  if (status === "signed-in") return null;
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center">
      <UserPlus className="mx-auto h-5 w-5 text-muted-foreground" />
      <p className="mt-2 text-sm font-medium text-foreground">
        Mai mult din calculul tău
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Creează un cont gratuit sau autentifică-te pentru a salva calculele și a
        folosi funcțiile extinse de export, inclusiv PDF și Excel.
      </p>
      <Link
        to="/auth"
        className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Creează cont sau autentifică-te
      </Link>
    </div>
  );
}
