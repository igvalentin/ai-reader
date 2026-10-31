CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_settings_public_read"
ON public.site_settings FOR SELECT
USING (true);

CREATE POLICY "site_settings_admin_write"
ON public.site_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER site_settings_set_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.site_settings (key, value) VALUES
('site_identity', '{"platformName":"Alevanta","legalEntity":"[Denumire entitate juridică]","registrationNumber":"[Nr. înregistrare / CUI]","address":"[Adresă sediu]","contactEmail":"contact@alevanta.info","dpoEmail":"contact@alevanta.info"}'::jsonb),
('legal_terms', '{"intro":"","liability":"","gdpr":"","advertising":"","premium":"","donations":"","calculators":""}'::jsonb),
('about_page', '{"mission":"","philosophy":"","audience":""}'::jsonb)
ON CONFLICT (key) DO NOTHING;