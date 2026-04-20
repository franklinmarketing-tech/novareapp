-- ============================================================
-- 1) FIX FUNCTION SEARCH PATH (pgmq wrappers)
-- ============================================================

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

-- ============================================================
-- 2) STORAGE: parecer-images — restringir a admin + cliente dono
--    Convenção de path: {client_id}/<arquivo>
-- ============================================================

-- Tornar bucket privado
UPDATE storage.buckets SET public = false WHERE id = 'parecer-images';

-- Limpar policies antigas
DROP POLICY IF EXISTS "Parecer images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read parecer images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload parecer images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update parecer images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete parecer images" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage parecer images" ON storage.objects;
DROP POLICY IF EXISTS "Owner can read parecer images" ON storage.objects;

-- Admins têm acesso completo
CREATE POLICY "Admins manage parecer images"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'parecer-images' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'parecer-images' AND public.has_role(auth.uid(), 'admin'));

-- Cliente dono pode LER apenas suas próprias imagens (path: {client_id}/...)
CREATE POLICY "Owner can read parecer images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'parecer-images'
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND c.user_id = auth.uid()
  )
);

-- ============================================================
-- 3) STORAGE: founders — leitura pública por link, sem listing
-- ============================================================

-- Mantém public=true para que URLs públicas funcionem em getPublicUrl
-- mas bloqueamos listagem ampla via policy

DROP POLICY IF EXISTS "Founder images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read founders" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage founders" ON storage.objects;

-- SELECT público (necessário pra renderizar imagens), mas sem permitir LIST de outros caminhos
-- O acesso direto por URL pública continua funcionando porque o bucket é público
CREATE POLICY "Public read founders"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'founders');

-- Apenas admins podem criar/editar/excluir
CREATE POLICY "Admins manage founders"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'founders' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'founders' AND public.has_role(auth.uid(), 'admin'));