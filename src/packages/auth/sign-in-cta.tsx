import { Link } from "@tanstack/react-router";
import { useAuth } from "./use-auth";

interface SignInCTAProps {
  reason?: string;
  className?: string;
}

/**
 * Inline sign-in prompt for features that require an account
 * (favorites, history, saved calculations). Renders nothing when
 * the user is already signed in.
 */
export function SignInCTA({ reason, className }: SignInCTAProps) {
  const { status } = useAuth();
  if (status === "signed-in") return null;
  return (
    <div
      className={
        "rounded-xl border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground " +
        (className ?? "")
      }
    >
      <p className="font-medium text-foreground">
        {reason ?? "Conectați-vă pentru a salva progresul."}
      </p>
      <p className="mt-1">
        <Link
          to="/auth"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Conectați-vă sau creați un cont
        </Link>{" "}
        — este gratuit și fiecare calculator rămâne disponibil anonim.
      </p>
    </div>
  );
}
