-- Adiciona month_ref em debts, assets e insurance — já existe em
-- income, expenses e goals. Necessário para o modelo onde cada
-- fechamento de mês gera uma cópia de todos os itens para o mês seguinte.
-- Registros legados (month_ref NULL) representam o estado inicial / sem mês definido.

ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS month_ref date;

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS month_ref date;

ALTER TABLE public.insurance
  ADD COLUMN IF NOT EXISTS month_ref date;

CREATE INDEX IF NOT EXISTS idx_debts_client_month
  ON public.debts(client_id, month_ref);

CREATE INDEX IF NOT EXISTS idx_assets_client_month
  ON public.assets(client_id, month_ref);

CREATE INDEX IF NOT EXISTS idx_insurance_client_month
  ON public.insurance(client_id, month_ref);
