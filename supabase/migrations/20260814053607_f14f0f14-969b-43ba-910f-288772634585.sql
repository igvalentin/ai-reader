CREATE OR REPLACE FUNCTION public.admission_programs_filter_options(
  p_city text DEFAULT '',
  p_university_type text DEFAULT '',
  p_profile text DEFAULT '',
  p_specialization text DEFAULT '',
  p_study_form text DEFAULT '',
  p_admission_type text DEFAULT '',
  p_admission_subject text DEFAULT ''
)
RETURNS TABLE(kind text, value text)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT s.*,
      (COALESCE(p_city,'') = '' OR s.city = p_city) AS m_city,
      (COALESCE(p_university_type,'') = '' OR s.university_type = p_university_type) AS m_utype,
      (COALESCE(p_profile,'') = '' OR s.profile = p_profile) AS m_profile,
      (COALESCE(p_specialization,'') = '' OR s.specialization = p_specialization) AS m_spec,
      (COALESCE(p_study_form,'') = '' OR s.study_form = p_study_form) AS m_form,
      (COALESCE(p_admission_type,'') = '' OR s.admission_type = p_admission_type) AS m_atype,
      (COALESCE(p_admission_subject,'') = '' OR s.admission_subject ILIKE '%' || p_admission_subject || '%') AS m_subject
    FROM public.admission_programs s
    WHERE s.active
  )
  SELECT 'city'::text, b.city FROM base b
    WHERE b.m_utype AND b.m_profile AND b.m_spec AND b.m_form AND b.m_atype AND b.m_subject
      AND b.city IS NOT NULL AND b.city <> '' GROUP BY b.city
  UNION ALL
  SELECT 'profile'::text, b.profile FROM base b
    WHERE b.m_city AND b.m_utype AND b.m_spec AND b.m_form AND b.m_atype AND b.m_subject
      AND b.profile IS NOT NULL AND b.profile <> '' GROUP BY b.profile
  UNION ALL
  SELECT 'specialization'::text, b.specialization FROM base b
    WHERE b.m_city AND b.m_utype AND b.m_profile AND b.m_form AND b.m_atype AND b.m_subject
      AND b.specialization IS NOT NULL AND b.specialization <> '' GROUP BY b.specialization
  UNION ALL
  SELECT 'study_form'::text, b.study_form FROM base b
    WHERE b.m_city AND b.m_utype AND b.m_profile AND b.m_spec AND b.m_atype AND b.m_subject
      AND b.study_form IS NOT NULL AND b.study_form <> '' GROUP BY b.study_form
  UNION ALL
  SELECT 'admission_type'::text, b.admission_type FROM base b
    WHERE b.m_city AND b.m_utype AND b.m_profile AND b.m_spec AND b.m_form AND b.m_subject
      AND b.admission_type IS NOT NULL AND b.admission_type <> '' GROUP BY b.admission_type
  UNION ALL
  SELECT 'admission_subject'::text, btrim(t.subject)
    FROM base b,
         LATERAL regexp_split_to_table(b.admission_subject, '\s*(,|;|/|\+|\så\s|\sși\s)\s*') AS t(subject)
    WHERE b.m_city AND b.m_utype AND b.m_profile AND b.m_spec AND b.m_form AND b.m_atype
      AND b.admission_subject IS NOT NULL AND b.admission_subject <> ''
      AND btrim(t.subject) <> ''
    GROUP BY btrim(t.subject)
  UNION ALL
  SELECT 'reference_year'::text, b.reference_year::text FROM base b
    WHERE b.m_city AND b.m_utype AND b.m_profile AND b.m_spec AND b.m_form AND b.m_atype AND b.m_subject
      AND b.reference_year IS NOT NULL GROUP BY b.reference_year;
$function$;

REVOKE ALL ON FUNCTION public.admission_programs_filter_options(text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admission_programs_filter_options(text,text,text,text,text,text,text) TO anon, authenticated, service_role;