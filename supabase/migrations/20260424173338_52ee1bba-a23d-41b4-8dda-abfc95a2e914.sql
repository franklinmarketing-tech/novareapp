-- Tabela de fechamentos mensais
CREATE TABLE public.monthly_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  month_ref date NOT NULL, -- sempre primeiro dia do mês
  status text NOT NULL DEFAULT 'fechado', -- 'fechado' | 'reaberto'

  -- Totais (snapshot)
  total_income numeric DEFAULT 0,
  total_expenses numeric DEFAULT 0,
  total_assets numeric DEFAULT 0,
  total_debts numeric DEFAULT 0,
  monthly_debt_payments numeric DEFAULT 0,
  net_worth numeric DEFAULT 0,
  savings_rate numeric DEFAULT 0,
  emergency_reserve_months numeric DEFAULT 0,
  plan_completion_pct numeric DEFAULT 0,

  -- Snapshot detalhado (arrays de objetos)
  income_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  expenses_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  debts_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  assets_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  insurance_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  goals_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_plan_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,

  notes text,

  closed_at timestamp with time zone NOT NULL DEFAULT now(),
  closed_by uuid NOT NULL,
  reopened_at timestamp with time zone,
  reopened_by uuid,

  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Garantir um único fechamento por cliente/mês
CREATE UNIQUE INDEX monthly_closings_client_month_unique
  ON public.monthly_closings (client_id, month_ref);

CREATE INDEX monthly_closings_client_idx
  ON public.monthly_closings (client_id, month_ref DESC);

-- updated_at trigger
CREATE TRIGGER monthly_closings_updated_at
  BEFORE UPDATE ON public.monthly_closings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.monthly_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all closings"
  ON public.monthly_closings FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert closings"
  ON public.monthly_closings FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update closings"
  ON public.monthly_closings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete closings"
  ON public.monthly_closings FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view own closings"
  ON public.monthly_closings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = monthly_closings.client_id
      AND clients.user_id = auth.uid()
  ));

CREATE POLICY "Super admins manage closings"
  ON public.monthly_closings FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));