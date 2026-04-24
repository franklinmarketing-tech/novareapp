-- 1. Restringe leitura de app_global_config a admins e super admins
DROP POLICY IF EXISTS "Authenticated can view global config" ON public.app_global_config;
CREATE POLICY "Admins can view global config"
ON public.app_global_config
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

-- 2. Remove política permissiva de INSERT em notifications (edge functions usam service role)
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

-- 3. Realtime: restringe assinaturas de investment_recommendations ao dono ou admin
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read own investment_recommendations realtime" ON realtime.messages;
CREATE POLICY "Authenticated read own investment_recommendations realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (extension = 'postgres_changes' AND (
    public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.investment_recommendations ir
      JOIN public.clients c ON c.id = ir.client_id
      WHERE c.user_id = auth.uid()
    )
  ))
  OR extension <> 'postgres_changes'
);
