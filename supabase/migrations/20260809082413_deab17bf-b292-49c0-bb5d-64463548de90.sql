ALTER TABLE public.pension_settings
  ADD COLUMN IF NOT EXISTS cas_percent numeric NOT NULL DEFAULT 25;

ALTER TABLE public.vocational_professions
  ADD COLUMN IF NOT EXISTS competencies text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS activities text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.vocational_programs
  ADD COLUMN IF NOT EXISTS description text;