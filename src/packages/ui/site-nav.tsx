import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { SITE } from "@/packages/shared";
import { signOut, useAuth } from "@/packages/auth";
import { useIsAdmin } from "@/packages/admin";
import { cn } from "@/lib/utils";

/**
 * Global header ImoIndex — navigare simplă: căutare, căutări salvate,
 * administrare (doar pentru administratori) și autentificare.
 */
export function SiteNav() {
  const { status, user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [mobileOpen, setMobileOpen] = useState(false);

  // Închide meniul mobil la schimbarea rutei.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function onSignOut() {
    setMobileOpen(false);
    await signOut();
    navigate({ to: "/", replace: true });
  }

  const isActive = (to: string) => pathname === to;

  const linkClass = (to: string) =>
    cn(
      "rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-foreground",
      isActive(to) ? "font-medium text-foreground" : "text-muted-foreground",
    );

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
        <Link
          to="/"
          className="flex min-w-0 flex-col leading-none"
          aria-label={`${SITE.name} — ${SITE.tagline}`}
        >
          <span className="font-display text-xl tracking-tight text-foreground">
            {SITE.name}
          </span>
          <span className="mt-0.5 hidden text-[11px] tracking-wide text-muted-foreground sm:block">
            {SITE.tagline}
          </span>
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          <Link to="/" search={{}} className={linkClass("/")} aria-current={isActive("/") ? "page" : undefined}>
            Căutare
          </Link>
          {status === "signed-in" ? (
            <Link to="/cautari-salvate" search={{}} className={linkClass("/cautari-salvate")} aria-current={isActive("/cautari-salvate") ? "page" : undefined}>
              Căutări salvate
            </Link>
          ) : null}
          {status === "signed-in" && isAdmin ? (
            <Link to="/admin" search={{}} className={linkClass("/admin")} aria-current={isActive("/admin") ? "page" : undefined}>
              Administrare
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {status === "loading" ? null : status === "signed-in" ? (
            <>
              <span className="hidden text-muted-foreground sm:inline">
                {user?.displayName ?? "Cont"}
              </span>
              <button
                type="button"
                onClick={onSignOut}
                className="hidden rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent sm:inline-flex"
              >
                Deconectare
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Autentificare
            </Link>
          )}
          <button
            type="button"
            aria-label={mobileOpen ? "Închide meniul" : "Deschide meniul"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-input text-foreground md:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <nav
          id="mobile-nav"
          aria-label="Meniu mobil"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border/60 bg-background px-5 py-3 md:hidden"
        >
          <ul className="grid gap-1 text-sm">
            <li>
              <Link to="/" search={{}} className="flex min-h-11 items-center text-foreground">
                Căutare
              </Link>
            </li>
            {status === "signed-in" ? (
              <>
                <li>
                  <Link to="/cautari-salvate" search={{}} className="flex min-h-11 items-center text-foreground">
                    Căutări salvate
                  </Link>
                </li>
                {isAdmin ? (
                  <li>
                    <Link to="/admin" search={{}} className="flex min-h-11 items-center text-foreground">
                      Administrare
                    </Link>
                  </li>
                ) : null}
                <li>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="flex min-h-11 w-full items-center text-left text-muted-foreground"
                  >
                    Deconectare
                  </button>
                </li>
              </>
            ) : null}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
