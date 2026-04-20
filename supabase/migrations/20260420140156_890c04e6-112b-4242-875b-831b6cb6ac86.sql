
-- 1) Bucket brand
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand', 'brand', true)
ON CONFLICT (id) DO NOTHING;

-- Policies do bucket brand
CREATE POLICY "Brand assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand');

CREATE POLICY "Admins can upload brand assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'brand' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update brand assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'brand' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete brand assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'brand' AND public.has_role(auth.uid(), 'admin'));

-- 2) Tabela app_settings (singleton)
CREATE TABLE public.app_settings (
  id integer PRIMARY KEY DEFAULT 1,
  company_name text NOT NULL DEFAULT 'Novare',
  logo_url text,
  brand_color text NOT NULL DEFAULT '#0F172A',
  support_email text,
  website_url text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = 1)
);

INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view app settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can update app settings"
ON public.app_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert app settings"
ON public.app_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) avatar_url em profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text;
