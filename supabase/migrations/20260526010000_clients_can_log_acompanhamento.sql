-- Permissão por cliente para lançar valores de acompanhamento no próprio painel.
-- Quando false (default), o cliente só visualiza. Quando true, o cliente edita
-- valor_atual e estado_atual nas metas (sem incluir/excluir itens ou metas).

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_can_log_acompanhamento boolean NOT NULL DEFAULT false;

-- Política adicional para o cliente atualizar acompanhamento_entradas APENAS
-- quando a permissão estiver ligada. Continua sendo bloqueado se a flag for false.
DROP POLICY IF EXISTS "client_write_own_acompanhamento_when_allowed" ON public.acompanhamento_entradas;
CREATE POLICY "client_write_own_acompanhamento_when_allowed"
  ON public.acompanhamento_entradas FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
       WHERE id = acompanhamento_entradas.client_id
         AND user_id = auth.uid()
         AND client_can_log_acompanhamento = true
    )
  );

DROP POLICY IF EXISTS "client_update_own_acompanhamento_when_allowed" ON public.acompanhamento_entradas;
CREATE POLICY "client_update_own_acompanhamento_when_allowed"
  ON public.acompanhamento_entradas FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
       WHERE id = acompanhamento_entradas.client_id
         AND user_id = auth.uid()
         AND client_can_log_acompanhamento = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
       WHERE id = acompanhamento_entradas.client_id
         AND user_id = auth.uid()
         AND client_can_log_acompanhamento = true
    )
  );
