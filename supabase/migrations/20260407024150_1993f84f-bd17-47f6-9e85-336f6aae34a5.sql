
-- Add client_code (sequential number) and slug columns
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS client_code serial;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS slug text;

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS clients_client_code_key ON public.clients(client_code);
CREATE UNIQUE INDEX IF NOT EXISTS clients_slug_key ON public.clients(slug);

-- Function to generate slug from profile name + client_code
CREATE OR REPLACE FUNCTION public.generate_client_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name text;
  _slug text;
BEGIN
  SELECT full_name INTO _name FROM public.profiles WHERE user_id = NEW.user_id;
  _name := COALESCE(_name, 'cliente');
  -- Normalize: lowercase, replace spaces with hyphens, remove accents/special chars
  _slug := lower(unaccent(_name));
  _slug := regexp_replace(_slug, '[^a-z0-9]+', '-', 'g');
  _slug := trim(both '-' from _slug);
  _slug := _slug || '-' || lpad(NEW.client_code::text, 4, '0');
  NEW.slug := _slug;
  RETURN NEW;
END;
$$;

-- Enable unaccent extension
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Trigger on insert
DROP TRIGGER IF EXISTS trg_generate_client_slug ON public.clients;
CREATE TRIGGER trg_generate_client_slug
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_client_slug();

-- Backfill existing clients
UPDATE public.clients c
SET slug = (
  SELECT lower(regexp_replace(trim(both '-' from regexp_replace(lower(unaccent(COALESCE(p.full_name, 'cliente'))), '[^a-z0-9]+', '-', 'g')), '-+', '-', 'g')) || '-' || lpad(c.client_code::text, 4, '0')
  FROM public.profiles p WHERE p.user_id = c.user_id
)
WHERE c.slug IS NULL;

-- Make slug NOT NULL after backfill
ALTER TABLE public.clients ALTER COLUMN slug SET NOT NULL;
