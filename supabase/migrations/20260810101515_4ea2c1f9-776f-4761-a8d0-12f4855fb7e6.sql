-- Feature flags: remove public/anon read
DROP POLICY IF EXISTS "feature_flags_read_all" ON public.feature_flags;
CREATE POLICY "feature_flags_read_authenticated"
  ON public.feature_flags FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.feature_flags FROM anon;

-- Feature flag overrides: admins only
DROP POLICY IF EXISTS "flag_overrides_read_all" ON public.feature_flag_overrides;
REVOKE SELECT ON public.feature_flag_overrides FROM anon;

-- Trigger-only SECURITY DEFINER functions must not be callable via the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_default_free_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_salary_tax_rule_change() FROM PUBLIC, anon, authenticated;

-- Role helpers: needed by RLS policies for signed-in users only
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_premium(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_premium(uuid) TO authenticated, service_role;