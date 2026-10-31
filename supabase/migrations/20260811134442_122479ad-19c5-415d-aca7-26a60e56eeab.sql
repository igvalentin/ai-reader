-- 1. Remove broad authenticated read on feature_flags
DROP POLICY IF EXISTS feature_flags_read_authenticated ON public.feature_flags;
DROP POLICY IF EXISTS feature_flag_overrides_read_authenticated ON public.feature_flag_overrides;

-- Server-side evaluator: returns only the enabled/disabled result, never the config
CREATE OR REPLACE FUNCTION public.evaluate_feature_flags(_app_id text DEFAULT NULL)
RETURNS TABLE(key text, enabled boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.key,
    CASE
      WHEN f.starts_at IS NOT NULL AND f.starts_at > now() THEN false
      WHEN f.ends_at IS NOT NULL AND f.ends_at < now() THEN false
      WHEN uo.enabled IS NOT NULL THEN uo.enabled
      WHEN ao.enabled IS NOT NULL THEN ao.enabled
      WHEN f.enabled IS FALSE THEN false
      WHEN f.premium_only AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('premium'::app_role, 'donor'::app_role, 'admin'::app_role)
      ) THEN false
      WHEN f.rollout_percentage < 100 THEN
        auth.uid() IS NOT NULL
        AND (abs(hashtext(auth.uid()::text || ':' || f.key)) % 100) < f.rollout_percentage
      ELSE true
    END AS enabled
  FROM public.feature_flags f
  LEFT JOIN public.feature_flag_overrides uo
    ON uo.flag_key = f.key AND uo.scope = 'user' AND uo.scope_id = auth.uid()::text
  LEFT JOIN public.feature_flag_overrides ao
    ON ao.flag_key = f.key AND ao.scope = 'app' AND _app_id IS NOT NULL AND ao.scope_id = _app_id;
$$;

REVOKE ALL ON FUNCTION public.evaluate_feature_flags(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_feature_flags(text) TO anon, authenticated, service_role;

-- 2. Lock down storage.objects (admin-only private export bucket)
DROP POLICY IF EXISTS "db_export_admin_select" ON storage.objects;
DROP POLICY IF EXISTS "db_export_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "db_export_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "db_export_admin_delete" ON storage.objects;

CREATE POLICY "db_export_admin_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'database_export_11_08_26' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "db_export_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'database_export_11_08_26' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "db_export_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'database_export_11_08_26' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'database_export_11_08_26' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "db_export_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'database_export_11_08_26' AND public.has_role(auth.uid(), 'admin'::app_role));