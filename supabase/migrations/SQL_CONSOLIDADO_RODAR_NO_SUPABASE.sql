-- ============================================================
-- SQL CONSOLIDADO — rodar no Supabase Dashboard > SQL Editor
-- Inclui: parecer_metas + acompanhamento_entradas
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. TABELA: parecer_metas
--    Armazena as metas definidas pelo consultor para cada item
--    financeiro do onboarding (append via upsert com conflito).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.parecer_metas (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source_table  text        NOT NULL,
  source_id     uuid        NOT NULL,
  source_label  text        NOT NULL,
  current_value numeric,
  meta_text     text,
  meta_valor    numeric,
  ai_suggestion text,
  prazo         date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, source_table, source_id)
);

-- Adiciona coluna prazo caso a tabela já existia sem ela
ALTER TABLE public.parecer_metas ADD COLUMN IF NOT EXISTS prazo date;

CREATE INDEX IF NOT EXISTS idx_parecer_metas_client
  ON public.parecer_metas(client_id);

ALTER TABLE public.parecer_metas ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas antes de recriar (evita erro se já existem)
DROP POLICY IF EXISTS "admin_all_parecer_metas"            ON public.parecer_metas;
DROP POLICY IF EXISTS "client_read_own_parecer_metas"      ON public.parecer_metas;

CREATE POLICY "admin_all_parecer_metas"
  ON public.parecer_metas FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "client_read_own_parecer_metas"
  ON public.parecer_metas FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.clients WHERE id = parecer_metas.client_id AND user_id = auth.uid())
  );


-- ─────────────────────────────────────────────────────────────
-- 2. TABELA: acompanhamento_entradas
--    Registros append-only de acompanhamento de metas.
--    Cada save do consultor = nova linha.
--    Fechamento do mês = linha com is_closing_snapshot = true.
-- ─────────────────────────────────────────────────────────────
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

DROP POLICY IF EXISTS "admin_all_acompanhamento_entradas"          ON public.acompanhamento_entradas;
DROP POLICY IF EXISTS "client_read_own_acompanhamento_entradas"    ON public.acompanhamento_entradas;

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


-- ─────────────────────────────────────────────────────────────
-- FIM — após rodar, configure também:
--   Supabase > Edge Functions > Secrets:
--   ANTHROPIC_API_KEY = <sua chave da API da Anthropic>
-- ─────────────────────────────────────────────────────────────
