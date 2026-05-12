-- =====================================================================
-- MIGRATIONS V9 — Consolidado para aplicar no Supabase Dashboard
-- =====================================================================
-- Cole TODO este bloco no SQL Editor do Supabase e clique em "Run".
-- Todas as alteracoes sao idempotentes (IF NOT EXISTS / DROP IF EXISTS)
-- entao eh seguro rodar mais de uma vez.
-- =====================================================================

-- 1) consultant_notes.snapshots (chips do parecer)
ALTER TABLE public.consultant_notes
  ADD COLUMN IF NOT EXISTS snapshots jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.consultant_notes.snapshots IS
  'Lista de chips inseridos no parecer referenciando dados do onboarding. Imutavel apos insercao.';

-- 2) action_plans — campos do Plano de Acao V9 (A/B/C aplicado + cache da IA)
ALTER TABLE public.action_plans
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS applied_variant text,
  ADD COLUMN IF NOT EXISTS applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_parecer_id uuid REFERENCES public.consultant_notes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custom_instructions text,
  ADD COLUMN IF NOT EXISTS ai_generated_plans jsonb;

COMMENT ON COLUMN public.action_plans.objective IS
  'Objetivo descritivo do plano aplicado (definido pelo consultor no popup de geracao).';
COMMENT ON COLUMN public.action_plans.applied_variant IS
  'Variante aplicada: A, B ou C (nullable enquanto nada foi aplicado).';
COMMENT ON COLUMN public.action_plans.source_parecer_id IS
  'Parecer (consultant_notes) usado como referencia na geracao da IA.';
COMMENT ON COLUMN public.action_plans.custom_instructions IS
  'Instrucoes adicionais do consultor a IA na geracao do plano.';
COMMENT ON COLUMN public.action_plans.ai_generated_plans IS
  'Array com os 3 planos retornados pela IA na ultima rodada (cache para revisao).';

-- 3) action_plans.goal_id (entrelaçamento com goals)
ALTER TABLE public.action_plans
  ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.action_plans.goal_id IS
  'Objetivo (goals) ao qual este plano esta entrelacado. Definido no popup de geracao da IA.';

-- 4) action_items.realized_impact (Tabela de Metas no Acompanhamento)
ALTER TABLE public.action_items
  ADD COLUMN IF NOT EXISTS realized_impact numeric;

COMMENT ON COLUMN public.action_items.realized_impact IS
  'Valor mensal realizado pelo cliente nesta acao (preenchido somente pelo consultor — V9 bloqueio de seguranca).';

-- 5) daily_progress_snapshots (comparacao Hoje vs Ontem no Acompanhamento)
CREATE TABLE IF NOT EXISTS public.daily_progress_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  total_income numeric,
  total_expenses numeric,
  total_debts numeric,
  total_assets numeric,
  monthly_debt_payments numeric,
  net_worth numeric,
  savings_rate numeric,
  completed_actions integer,
  total_actions integer,
  completed_impact numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_snapshots_client_date
  ON public.daily_progress_snapshots (client_id, snapshot_date DESC);

ALTER TABLE public.daily_progress_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage daily snapshots" ON public.daily_progress_snapshots;
CREATE POLICY "admins manage daily snapshots"
  ON public.daily_progress_snapshots
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "clients read own daily snapshots" ON public.daily_progress_snapshots;
CREATE POLICY "clients read own daily snapshots"
  ON public.daily_progress_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = daily_progress_snapshots.client_id
        AND c.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.daily_progress_snapshots IS
  'Snapshots diarios de KPIs financeiros + progresso do plano. Atualizado por upsert no AdminMonitoring.';

-- 6) FORCE schema reload — sem isso o supabase-js mantem o schema antigo em cache
NOTIFY pgrst, 'reload schema';
