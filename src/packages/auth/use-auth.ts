/**
 * Auth façade — Supabase-backed.
 *
 * Single source of truth every app imports from `@/packages/auth`.
 * Subscribes to Supabase auth state so the UI stays in sync across tabs.
 */
import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface AuthState {
  status: "loading" | "signed-in" | "signed-out";
  user: AuthUser | null;
  session: Session | null;
}

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    id: user.id,
    email: user.email ?? null,
    displayName:
      (meta.display_name as string | undefined) ??
      (meta.name as string | undefined) ??
      (user.email ? user.email.split("@")[0] : null),
    avatarUrl: (meta.avatar_url as string | undefined) ?? null,
  };
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
    session: null,
  });

  useEffect(() => {
    let mounted = true;

    // Register listener FIRST, then hydrate — avoids missing the initial event.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState({
        status: session?.user ? "signed-in" : "signed-out",
        user: toAuthUser(session?.user ?? null),
        session: session ?? null,
      });
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState({
        status: data.session?.user ? "signed-in" : "signed-out",
        user: toAuthUser(data.session?.user ?? null),
        session: data.session ?? null,
      });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
