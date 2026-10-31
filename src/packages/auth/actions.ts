/**
 * Auth actions — thin wrappers so callers never reach into
 * Supabase directly. Swapping providers later stays a
 * single-package change.
 */
import { supabase } from "@/integrations/supabase/client";


export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth`,
      data: displayName ? { display_name: displayName } : undefined,
    },
  });
}

export async function signInWithGoogle() {
  // Native Supabase OAuth — the callback is handled by the Supabase project
  // (https://<ref>.supabase.co/auth/v1/callback), then returned to this origin.
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
}

export async function sendPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

export async function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}

export async function signOut() {
  return supabase.auth.signOut();
}
