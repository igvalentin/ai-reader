CREATE TABLE public.salary_tax_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_to date,
  cas_percent numeric(6,3) NOT NULL DEFAULT 25,
  cass_percent numeric(6,3) NOT NULL DEFAULT 10,
  income_tax_percent numeric(6,3) NOT NULL DEFAULT 10,
  cam_percent numeric(6,3) NOT NULL DEFAULT 2.25,
  is_active boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT salary_tax_rules_cas_range CHECK (cas_percent >= 0 AND cas_percent <= 100),
  CONSTRAINT salary_tax_rules_cass_range CHECK (cass_percent >= 0 AND cass_percent <= 100),
  CONSTRAINT salary_tax_rules_tax_range CHECK (income_tax_percent >= 0 AND income_tax_percent <= 100),
  CONSTRAINT salary_tax_rules_cam_range CHECK (cam_percent >= 0 AND cam_percent <= 100),
  CONSTRAINT salary_tax_rules_validity CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

GRANT SELECT ON public.salary_tax_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_tax_rules TO authenticated;
GRANT ALL ON public.salary_tax_rules TO service_role;

ALTER TABLE public.salary_tax_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY salary_tax_rules_public_read ON public.salary_tax_rules
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY salary_tax_rules_admin_write ON public.salary_tax_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX salary_tax_rules_active_idx ON public.salary_tax_rules (is_active, valid_from DESC);

CREATE TRIGGER salary_tax_rules_set_updated_at
  BEFORE UPDATE ON public.salary_tax_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.salary_tax_rule_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL,
  action text NOT NULL,
  changed_by uuid,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.salary_tax_rule_history TO authenticated;
GRANT ALL ON public.salary_tax_rule_history TO service_role;

ALTER TABLE public.salary_tax_rule_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY salary_tax_rule_history_admin_read ON public.salary_tax_rule_history
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX salary_tax_rule_history_rule_idx ON public.salary_tax_rule_history (rule_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_salary_tax_rule_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.salary_tax_rule_history (rule_id, action, changed_by, snapshot)
    VALUES (OLD.id, 'delete', auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;

  INSERT INTO public.salary_tax_rule_history (rule_id, action, changed_by, snapshot)
  VALUES (NEW.id, lower(TG_OP), auth.uid(), to_jsonb(NEW));
  RETURN NEW;
END;
$$;

CREATE TRIGGER salary_tax_rules_history_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.salary_tax_rules
  FOR EACH ROW EXECUTE FUNCTION public.log_salary_tax_rule_change();

INSERT INTO public.salary_tax_rules
  (valid_from, valid_to, cas_percent, cass_percent, income_tax_percent, cam_percent, is_active, notes)
VALUES
  ('2024-01-01', NULL, 25, 10, 10, 2.25, true, 'Valori standard conform legislației fiscale din România.');