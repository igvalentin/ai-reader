CREATE TABLE public.admission_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  university_id text,
  university_name text NOT NULL,
  university_type text CHECK (university_type IN ('public','private')),
  faculty_id text,
  faculty_name text,
  city text,
  county text,
  profile text,
  specialization text,
  monitorul_oficial_code text,
  monitorul_oficial_source text,
  program_id text,
  program_name text,
  field_of_study text,
  language text,
  study_form text CHECK (study_form IN ('IF','IFR','ID')),
  admission_type text,
  admission_subject text,
  budget_places integer,
  special_budget_places integer,
  tax_places integer,
  annual_tuition numeric,
  last_admission_grade_budget numeric,
  last_admission_grade_tax numeric,
  reference_year integer,
  source_url text,
  verified boolean NOT NULL DEFAULT false,
  last_updated date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admission_programs TO anon;
GRANT SELECT ON public.admission_programs TO authenticated;
GRANT ALL ON public.admission_programs TO service_role;

ALTER TABLE public.admission_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active admission programs"
  ON public.admission_programs FOR SELECT
  USING (active);

CREATE INDEX idx_admission_programs_city ON public.admission_programs (city);
CREATE INDEX idx_admission_programs_profile ON public.admission_programs (profile);
CREATE INDEX idx_admission_programs_specialization ON public.admission_programs (specialization);
CREATE INDEX idx_admission_programs_study_form ON public.admission_programs (study_form);
CREATE INDEX idx_admission_programs_admission_type ON public.admission_programs (admission_type);
CREATE INDEX idx_admission_programs_university_type ON public.admission_programs (university_type);
CREATE INDEX idx_admission_programs_reference_year ON public.admission_programs (reference_year);
CREATE INDEX idx_admission_programs_active ON public.admission_programs (active);

CREATE TRIGGER admission_programs_set_updated_at
  BEFORE UPDATE ON public.admission_programs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.admission_program_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.admission_programs(id) ON DELETE CASCADE,
  source_type text NOT NULL DEFAULT 'other',
  url text,
  document_title text,
  retrieved_at timestamptz,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admission_program_sources TO anon;
GRANT SELECT ON public.admission_program_sources TO authenticated;
GRANT ALL ON public.admission_program_sources TO service_role;

ALTER TABLE public.admission_program_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read admission program sources"
  ON public.admission_program_sources FOR SELECT
  USING (true);

CREATE INDEX idx_admission_program_sources_program ON public.admission_program_sources (program_id);

CREATE TABLE public.admission_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_by uuid,
  file_name text,
  mode text NOT NULL DEFAULT 'replace',
  total_rows integer NOT NULL DEFAULT 0,
  inserted_rows integer NOT NULL DEFAULT 0,
  rejected_rows integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admission_import_runs TO authenticated;
GRANT ALL ON public.admission_import_runs TO service_role;

ALTER TABLE public.admission_import_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read admission import runs"
  ON public.admission_import_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admission_programs_facets(p_profile text DEFAULT NULL)
RETURNS TABLE(kind text, value text)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT 'city'::text, s.city FROM public.admission_programs s
    WHERE s.active AND s.city IS NOT NULL AND s.city <> '' GROUP BY s.city
  UNION ALL
  SELECT 'profile'::text, s.profile FROM public.admission_programs s
    WHERE s.active AND s.profile IS NOT NULL AND s.profile <> '' GROUP BY s.profile
  UNION ALL
  SELECT 'specialization'::text, s.specialization FROM public.admission_programs s
    WHERE s.active AND s.specialization IS NOT NULL AND s.specialization <> ''
      AND (p_profile IS NULL OR p_profile = '' OR s.profile = p_profile)
    GROUP BY s.specialization
  UNION ALL
  SELECT 'study_form'::text, s.study_form FROM public.admission_programs s
    WHERE s.active AND s.study_form IS NOT NULL AND s.study_form <> '' GROUP BY s.study_form
  UNION ALL
  SELECT 'admission_type'::text, s.admission_type FROM public.admission_programs s
    WHERE s.active AND s.admission_type IS NOT NULL AND s.admission_type <> '' GROUP BY s.admission_type
  UNION ALL
  SELECT 'admission_subject'::text, t.subject
    FROM public.admission_programs s,
         LATERAL regexp_split_to_table(s.admission_subject, '\s*(,|;|/|\+|\så\s|\sși\s)\s*') AS t(subject)
    WHERE s.active AND s.admission_subject IS NOT NULL AND s.admission_subject <> ''
      AND btrim(t.subject) <> ''
    GROUP BY t.subject
  UNION ALL
  SELECT 'reference_year'::text, s.reference_year::text FROM public.admission_programs s
    WHERE s.active AND s.reference_year IS NOT NULL GROUP BY s.reference_year;
$function$;

GRANT EXECUTE ON FUNCTION public.admission_programs_facets(text) TO anon, authenticated;