-- V9: snapshots diarios automaticos para Acompanhamento
--
-- Permite comparativos finos (hoje vs ontem, semana atual vs semana anterior).
-- Eh complementar ao monthly_closings (que continua sendo o "fechamento oficial").
--
-- Estrategia de povoamento: o frontend (AdminMonitoring) faz UPSERT do snapshot
-- de "hoje" toda vez que a pagina carrega — se ja existe row de hoje, sobrescreve;
-- se nao existe, cria. Assim sempre temos o dado mais fresco de hoje.

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

-- Admins podem ler e escrever em qualquer cliente
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

-- Cliente pode LER seus proprios snapshots (somente leitura — quem escreve eh o admin)
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
COMMENT ON COLUMN public.daily_progress_snapshots.snapshot_date IS
  'Data do snapshot (uma row por cliente por dia).';
COMMENT ON COLUMN public.daily_progress_snapshots.completed_impact IS
  'Soma do realized_impact das acoes concluidas neste cliente ate o dia do snapshot.';
