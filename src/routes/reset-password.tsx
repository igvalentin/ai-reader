import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { buildHead } from "@/packages/seo";
import { Container, Section } from "@/packages/ui";
import { updatePassword } from "@/packages/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
  head: () =>
    buildHead({
      title: "Resetare parolă",
      description: "Alege o parolă nouă pentru contul tău ImoIndex.",
      path: "/reset-password",
      noindex: true,
    }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await updatePassword(password);
      if (error) throw error;
      toast.success("Parola a fost actualizată");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Parola nu a putut fi actualizată");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section className="pt-16 sm:pt-24 pb-24">
      <Container>
        <div className="mx-auto max-w-md">
          <h1 className="font-display text-3xl tracking-tight text-foreground">
            Alege o parolă nouă
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Introdu o parolă nouă pentru contul tău ImoIndex.
          </p>
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">
                Parolă nouă
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </label>
            <Button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? "Se actualizează…" : "Actualizează parola"}
            </Button>
          </form>
        </div>
      </Container>
    </Section>
  );
}
