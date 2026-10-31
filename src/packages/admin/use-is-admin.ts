import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/packages/auth";

/**
 * Centralized admin check — reads the caller's own `user_roles` row
 * (allowed by RLS for the signed-in user). Never trust client storage.
 */
export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const { status, user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (status !== "signed-in" || !user) {
      setIsAdmin(false);
      setLoading(status === "loading");
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        setIsAdmin(!error && !!data);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, user]);

  return { isAdmin, loading };
}
