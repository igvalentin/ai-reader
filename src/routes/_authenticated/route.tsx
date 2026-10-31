import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Container, Section } from "@/packages/ui";
import { useAuth } from "@/packages/auth";

export const Route = createFileRoute("/_authenticated")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href },
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const location = useLocation();
  return (
    <Section className="pt-14 pb-24">
      <Container>
        <nav
          aria-label="Cont"
          className="mb-10 flex flex-wrap gap-1 border-b border-border/60 pb-2 text-sm"
        >
          <AccountLink to="/cautari-salvate" current={location.pathname}>
            Căutări salvate
          </AccountLink>
        </nav>
        <Outlet />
      </Container>
    </Section>
  );
}

function AccountLink({
  to,
  current,
  children,
}: {
  to: "/cautari-salvate";
  current: string;
  children: React.ReactNode;
}) {
  const active = current === to;
  return (
    <Link
      to={to}
      className={
        "rounded-md px-3 py-1.5 transition-colors " +
        (active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </Link>
  );
}

// Consumer hook — child routes read the signed-in user here.
export function useAuthenticatedUser() {
  const { user } = useAuth();
  return user;
}
