-- Registros de acompanhamento das metas definidas no parecer.
-- Cada save do consultor gera uma linha (append-only).
-- Fechamento do mês gera uma linha com is_closing_snapshot=true.

CREATE TABLE IF NOT EXISTS public.acompanhamento_entradas (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  meta_id             uuid        REFERENCES public.parecer_metas(id) ON DELETE CASCADE,
  source_table        text        NOT NULL,
  source_id           uuid        NOT NULL,
  source_label        text        NOT NULL,
  valor_meta          numeric,
  prazo               date,
  valor_atual         numeric,
  estado_atual        text,
  progresso_pct       numeric,
  is_closing_snapshot boolean     NOT NULL DEFAULT false,
  month_closing_id    uuid        REFERENCES public.monthly_closings(id) ON DELETE SET NULL,
  snapshotted_at      timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acomp_client_meta
  ON public.acompanhamento_entradas(client_id, meta_id, snapshotted_at DESC);

CREATE INDEX IF NOT EXISTS idx_acomp_closing
  ON public.acompanhamento_entradas(month_closing_id)
  WHERE month_closing_id IS NOT NULL;

ALTER TABLE public.acompanhamento_entradas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_acompanhamento_entradas"
  ON public.acompanhamento_entradas FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "client_read_own_acompanhamento_entradas"
  ON public.acompanhamento_entradas FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.clients WHERE id = acompanhamento_entradas.client_id AND user_id = auth.uid())
  );
