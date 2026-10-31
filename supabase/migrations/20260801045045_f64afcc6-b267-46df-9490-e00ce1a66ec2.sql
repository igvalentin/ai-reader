CREATE TABLE public.admitere_liceu_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county text NOT NULL,
  school text NOT NULL,
  profile text,
  study_form text,
  specialization text,
  max_grade_2024 numeric,
  max_grade_2025 numeric,
  min_grade_2024 numeric,
  min_grade_2025 numeric,
  last_rank_2024 integer,
  last_rank_2025 integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admitere_liceu_schools TO anon;
GRANT SELECT ON public.admitere_liceu_schools TO authenticated;
GRANT ALL ON public.admitere_liceu_schools TO service_role;

ALTER TABLE public.admitere_liceu_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admitere_liceu_schools_public_read"
  ON public.admitere_liceu_schools
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX admitere_liceu_schools_county_idx ON public.admitere_liceu_schools (county);
CREATE INDEX admitere_liceu_schools_profile_idx ON public.admitere_liceu_schools (profile);
CREATE INDEX admitere_liceu_schools_specialization_idx ON public.admitere_liceu_schools (specialization);
CREATE INDEX admitere_liceu_schools_rank_idx ON public.admitere_liceu_schools (last_rank_2025, last_rank_2024);

CREATE OR REPLACE FUNCTION public.admitere_liceu_list_counties()
RETURNS TABLE (county text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.county
  FROM public.admitere_liceu_schools s
  WHERE s.county IS NOT NULL AND s.county <> ''
  GROUP BY s.county
  ORDER BY
    CASE WHEN upper(s.county) LIKE 'MUNICIPIUL BUCURE%' THEN 0 ELSE 1 END,
    s.county COLLATE "ro-RO-x-icu";
$$;

CREATE OR REPLACE FUNCTION public.admitere_liceu_list_specializations(p_profile text DEFAULT NULL)
RETURNS TABLE (specialization text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.specialization
  FROM public.admitere_liceu_schools s
  WHERE s.specialization IS NOT NULL AND s.specialization <> ''
    AND (p_profile IS NULL OR p_profile = '' OR s.profile = p_profile)
  GROUP BY s.specialization
  ORDER BY s.specialization COLLATE "ro-RO-x-icu";
$$;

CREATE OR REPLACE FUNCTION public.admitere_liceu_list_profiles()
RETURNS TABLE (profile text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.profile
  FROM public.admitere_liceu_schools s
  WHERE s.profile IS NOT NULL AND s.profile <> ''
  GROUP BY s.profile
  ORDER BY s.profile COLLATE "ro-RO-x-icu";
$$;

GRANT EXECUTE ON FUNCTION public.admitere_liceu_list_counties() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admitere_liceu_list_specializations(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admitere_liceu_list_profiles() TO anon, authenticated, service_role;