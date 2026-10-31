-- Pension calculator configuration (admin-managed, no redeploy needed)

CREATE TABLE public.pension_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  pension_point_value numeric NOT NULL DEFAULT 81,
  average_gross_salary numeric NOT NULL DEFAULT 8620,
  pillar2_contribution_percent numeric NOT NULL DEFAULT 4.75,
  default_annual_return_percent numeric NOT NULL DEFAULT 5,
  default_life_expectancy_years numeric NOT NULL DEFAULT 82,
  actuarial_coefficient numeric NOT NULL DEFAULT 220,
  notes text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pension_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pension_settings TO authenticated;
GRANT ALL ON public.pension_settings TO service_role;
ALTER TABLE public.pension_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY pension_settings_public_read ON public.pension_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pension_settings_admin_write ON public.pension_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER pension_settings_set_updated_at BEFORE UPDATE ON public.pension_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


CREATE TABLE public.pension_retirement_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gender text NOT NULL,
  age_years integer NOT NULL DEFAULT 65,
  age_months integer NOT NULL DEFAULT 0,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_to date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pension_retirement_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pension_retirement_rules TO authenticated;
GRANT ALL ON public.pension_retirement_rules TO service_role;
ALTER TABLE public.pension_retirement_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY pension_retirement_rules_public_read ON public.pension_retirement_rules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pension_retirement_rules_admin_write ON public.pension_retirement_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER pension_retirement_rules_set_updated_at BEFORE UPDATE ON public.pension_retirement_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


CREATE TABLE public.pension_stability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_years integer NOT NULL DEFAULT 0,
  max_years integer,
  points_per_year numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pension_stability_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pension_stability_rules TO authenticated;
GRANT ALL ON public.pension_stability_rules TO service_role;
ALTER TABLE public.pension_stability_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY pension_stability_rules_public_read ON public.pension_stability_rules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pension_stability_rules_admin_write ON public.pension_stability_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER pension_stability_rules_set_updated_at BEFORE UPDATE ON public.pension_stability_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- Seed current configuration
INSERT INTO public.pension_settings
  (valid_from, pension_point_value, average_gross_salary, pillar2_contribution_percent,
   default_annual_return_percent, default_life_expectancy_years, actuarial_coefficient, is_active, notes)
VALUES
  ('2025-01-01', 2574, 8620, 4.75, 5, 82, 220, true,
   'Valoarea punctului de referință și salariul mediu brut estimate. Se actualizează exclusiv din Admin.');

INSERT INTO public.pension_retirement_rules (gender, age_years, age_months, valid_from, is_active, notes) VALUES
  ('m', 65, 0, '2025-01-01', true, 'Vârsta standard de pensionare pentru bărbați.'),
  ('f', 63, 0, '2025-01-01', true, 'Vârsta standard de pensionare pentru femei.');

INSERT INTO public.pension_stability_rules (min_years, max_years, points_per_year, is_active, notes) VALUES
  (0, 25, 0, true, 'Fără puncte de stabilitate sub 26 de ani de contribuție.'),
  (26, 30, 0.5, true, '0,5 puncte pentru fiecare an între 26 și 30.'),
  (31, 35, 0.75, true, '0,75 puncte pentru fiecare an între 31 și 35.'),
  (36, NULL, 1, true, '1 punct pentru fiecare an peste 35.');