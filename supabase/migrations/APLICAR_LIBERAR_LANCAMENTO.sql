-- ============================================================
-- APLICAR NO SUPABASE DASHBOARD > SQL EDITOR > RUN
-- Corrige o botao "Liberar lancamento" do consultor.
-- Idempotente: pode rodar varias vezes sem efeito colateral.
-- ============================================================

-- 1) Coluna que controla a permissao do cliente
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_can_log_acompanhamento boolean NOT NULL DEFAULT false;

-- 2) Politica: cliente pode INSERIR lancamento apenas se a flag estiver true
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

-- 3) Politica: cliente pode ATUALIZAR lancamento apenas se a flag estiver true
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

-- 4) Forca o PostgREST a recarregar o schema cache (resolve o erro "column not found")
NOTIFY pgrst, 'reload schema';
