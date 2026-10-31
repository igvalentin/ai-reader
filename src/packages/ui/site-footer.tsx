import { Link } from "@tanstack/react-router";
import { SITE } from "@/packages/shared";

/** Global footer ImoIndex — identitate și legături esențiale. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.2fr_2fr]">
        <div>
          <Link
            to="/"
            className="font-display text-2xl tracking-tight text-foreground"
          >
            {SITE.name}
          </Link>
          <p className="mt-3 max-w-sm text-sm text-foreground/80">
            {SITE.tagline}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {SITE.positioning}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Imobiliare
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  to="/"
                  search={{}}
                  className="text-foreground/80 transition-colors hover:text-foreground"
                >
                  Apartamente în Brașov
                </Link>
              </li>
              <li>
                <Link
                  to="/cautari-salvate"
                  search={{}}
                  className="text-foreground/80 transition-colors hover:text-foreground"
                >
                  Căutări salvate
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>
            © {new Date().getFullYear()} {SITE.name}
          </span>
          <span>
            Datele din index provin numai din surse aprobate; verifică
            întotdeauna anunțul original înainte de o decizie.
          </span>
        </div>
      </div>
    </footer>
  );
}
