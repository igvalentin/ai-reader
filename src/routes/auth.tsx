import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { buildHead } from "@/packages/seo";
import { Container, Section } from "@/packages/ui";
import { Button } from "@/components/ui/button";
import { authDestination } from "@/packages/auth/redirect";
import {
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  useAuth,
} from "@/packages/auth";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["sign-in", "sign-up", "forgot"]).optional(),
});

export const Route = createFileRoute("/auth")({
  head: () =>
    buildHead({
      title: "Autentificare",
      description:
        "Autentifică-te în ImoIndex pentru a păstra căutările tale de apartamente.",
      path: "/auth",
      noindex: true,
    }),
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
});

type Mode = "sign-in" | "sign-up" | "forgot";

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { status } = useAuth();
  const [mode, setMode] = useState<Mode>(search.mode ?? "sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "signed-in") {
      navigate({ ...authDestination(search.redirect), replace: true });
    }
  }, [status, navigate, search.redirect]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "sign-in") {
        const { error } = await signInWithEmail(email, password);
        if (error) throw error;
      } else if (mode === "sign-up") {
        const { data, error } = await signUpWithEmail(email, password, displayName || undefined);
        if (error) throw error;
        toast.success(data.session ? "Cont creat — ești autentificat." : "Verifică emailul pentru confirmarea contului.");
      } else {
        const { error } = await sendPasswordReset(email);
        if (error) throw error;
        toast.success("Verifică-ți inbox-ul pentru link-ul de resetare.");
        setMode("sign-in");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ceva nu a mers bine");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    try {
      const result = await signInWithGoogle();
      if (result.error) throw result.error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Autentificarea cu Google a eșuat");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section className="pt-16 sm:pt-24 pb-24">
      <Container>
        <div className="mx-auto max-w-md">
          <h1 className="font-display text-3xl tracking-tight text-foreground">
            {mode === "sign-in"
              ? "Bine ai revenit"
              : mode === "sign-up"
                ? "Creează-ți contul"
                : "Resetează parola"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Contul tău ImoIndex.
          </p>

          {mode !== "forgot" && (
            <Button variant="outline"
              type="button"
              onClick={onGoogle}
              disabled={busy}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
            >
              Continuă cu Google
            </Button>
          )}

          {mode !== "forgot" && (
            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> sau <span className="h-px flex-1 bg-border" />
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "sign-up" && (
              <Field
                label="Nume afișat"
                value={displayName}
                onChange={setDisplayName}
                autoComplete="name"
                placeholder="Opțional"
              />
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            {mode !== "forgot" && (
              <Field
                label="Parolă"
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                required
                minLength={8}
              />
            )}
            <Button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {busy
                ? "Se procesează…"
                : mode === "sign-in"
                  ? "Autentifică-te"
                  : mode === "sign-up"
                    ? "Creează cont"
                    : "Trimite link de resetare"}
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            {mode === "sign-in" ? (
              <>
                <Button variant="link"
                  type="button"
                  className="underline underline-offset-4"
                  onClick={() => setMode("sign-up")}
                >
                  Creează un cont
                </Button>
                <Button variant="link"
                  type="button"
                  className="underline underline-offset-4"
                  onClick={() => setMode("forgot")}
                >
                  Ai uitat parola?
                </Button>
              </>
            ) : (
              <Button variant="link"
                type="button"
                className="underline underline-offset-4"
                onClick={() => setMode("sign-in")}
              >
                Înapoi la autentificare
              </Button>
            )}
          </div>

          <p className="mt-10 text-center text-xs text-muted-foreground">
            <Link to="/" className="underline underline-offset-4">
              Continuă ca vizitator
            </Link>{" "}
            — ImoIndex
          </p>
        </div>
      </Container>
    </Section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
        {...rest}
      />
    </label>
  );
}
