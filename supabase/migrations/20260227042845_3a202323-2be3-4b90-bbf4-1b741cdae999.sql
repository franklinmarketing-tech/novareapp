
-- Create storage bucket for parecer images
INSERT INTO storage.buckets (id, name, public)
VALUES ('parecer-images', 'parecer-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload files to parecer-images bucket
CREATE POLICY "Admins can upload parecer images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'parecer-images'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow public read access to parecer images
CREATE POLICY "Public can read parecer images"
ON storage.objects FOR SELECT
USING (bucket_id = 'parecer-images');

-- Allow admins to delete parecer images
CREATE POLICY "Admins can delete parecer images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'parecer-images'
  AND public.has_role(auth.uid(), 'admin')
);
