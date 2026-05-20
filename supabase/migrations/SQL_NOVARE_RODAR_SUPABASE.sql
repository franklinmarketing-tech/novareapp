-- =============================================================
-- NOVARE APP — SQL CONSOLIDADO PARA RODAR NO SUPABASE
-- Data: 2026-05-19
-- Rode este script no SQL Editor do painel Supabase:
-- https://supabase.com/dashboard/project/hjikeevfzfswqydduars/sql
--
-- Todos os comandos usam IF NOT EXISTS / IF NOT EXISTS para
-- serem seguros de rodar mais de uma vez (idempotente).
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. TABELA: parecer_metas
--    Metas definidas pelo consultor para cada item financeiro.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.parecer_metas (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source_table text        NOT NULL,  -- 'income' | 'expenses' | 'debts' | 'assets' | 'insurance' | 'goals'
  source_id    uuid        NOT NULL,
  source_label text        NOT NULL,
  current_value numeric,
  meta_text    text,
  meta_valor   numeric,
  ai_suggestion text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, source_table, source_id)
);

ALTER TABLE public.parecer_metas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'parecer_metas' AND policyname = 'admin_all_parecer_metas'
  ) THEN
    CREATE POLICY "admin_all_parecer_metas"
      ON public.parecer_metas FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'parecer_metas' AND policyname = 'client_read_own_parecer_metas'
  ) THEN
    CREATE POLICY "client_read_own_parecer_metas"
      ON public.parecer_metas FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.clients WHERE id = parecer_metas.client_id AND user_id = auth.uid()));
  END IF;
END $$;

-- Campo prazo (data-alvo da meta)
ALTER TABLE public.parecer_metas ADD COLUMN IF NOT EXISTS prazo date;


-- ─────────────────────────────────────────────────────────────
-- 2. TABELA: acompanhamento_entradas
--    Snapshots de acompanhamento (append-only).
--    Cada save do consultor gera uma linha.
--    Fechamento do mês gera linha com is_closing_snapshot = true.
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

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'acompanhamento_entradas' AND policyname = 'admin_all_acompanhamento_entradas'
  ) THEN
    CREATE POLICY "admin_all_acompanhamento_entradas"
      ON public.acompanhamento_entradas FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'acompanhamento_entradas' AND policyname = 'client_read_own_acompanhamento_entradas'
  ) THEN
    CREATE POLICY "client_read_own_acompanhamento_entradas"
      ON public.acompanhamento_entradas FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.clients WHERE id = acompanhamento_entradas.client_id AND user_id = auth.uid()));
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────
-- 3. TABELA goals — colunas novas
--    amount_applied: valor já investido/aplicado no objetivo
--    completed_at:   quando a meta foi atingida e arquivada
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS amount_applied numeric DEFAULT 0;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS completed_at   timestamptz DEFAULT NULL;


-- ─────────────────────────────────────────────────────────────
-- FIM DO SCRIPT
-- Após rodar, verifique no Table Editor que as tabelas
-- parecer_metas e acompanhamento_entradas existem, e que
-- goals possui as colunas amount_applied e completed_at.
-- =============================================================
