-- ─────────────────────────────────────────────────────────────────────────────
-- Diagnóstico mensal: cada mês tem seu próprio snapshot de diagnóstico.
-- Antes: 1 diagnóstico por cliente (último estado). Agora: 1 por (cliente, mês).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.diagnosis
  ADD COLUMN IF NOT EXISTS month_ref date;

CREATE INDEX IF NOT EXISTS idx_diagnosis_client_month
  ON public.diagnosis(client_id, month_ref);

-- Atribui month_ref ao primeiro mês conhecido do cliente para registros NULL existentes
DO $$
DECLARE
  c          RECORD;
  baseline   date;
  current_m  date := date_trunc('month', CURRENT_DATE)::date;
BEGIN
  FOR c IN SELECT id FROM public.clients LOOP
    SELECT MIN(month_ref)::date INTO baseline FROM (
      SELECT month_ref FROM public.monthly_closings WHERE client_id = c.id
      UNION ALL
      SELECT month_ref FROM public.income WHERE client_id = c.id AND month_ref IS NOT NULL
      UNION ALL
      SELECT month_ref FROM public.expenses WHERE client_id = c.id AND month_ref IS NOT NULL
    ) AS all_months;

    IF baseline IS NULL THEN baseline := current_m; END IF;

    UPDATE public.diagnosis SET month_ref = baseline
    WHERE client_id = c.id AND month_ref IS NULL;
  END LOOP;
END $$;

-- Garante 1 diagnóstico por (cliente, mês)
DROP INDEX IF EXISTS idx_diagnosis_client_month_unique;
CREATE UNIQUE INDEX idx_diagnosis_client_month_unique
  ON public.diagnosis(client_id, month_ref)
  WHERE month_ref IS NOT NULL;
