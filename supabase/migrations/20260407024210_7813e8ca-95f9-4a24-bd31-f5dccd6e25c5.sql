
DROP EXTENSION IF EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS unaccent SCHEMA extensions;

-- Update the function to reference extensions.unaccent
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
  _slug := lower(extensions.unaccent(_name));
  _slug := regexp_replace(_slug, '[^a-z0-9]+', '-', 'g');
  _slug := trim(both '-' from _slug);
  _slug := _slug || '-' || lpad(NEW.client_code::text, 4, '0');
  NEW.slug := _slug;
  RETURN NEW;
END;
$$;
