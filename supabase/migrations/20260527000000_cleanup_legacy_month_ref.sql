-- ─────────────────────────────────────────────────────────────────────────────
-- LIMPEZA DE DADOS LEGADOS (month_ref = NULL) + REMOÇÃO DE DUPLICATAS
-- ─────────────────────────────────────────────────────────────────────────────
-- Contexto: a feature "cada mês vira onboarding próprio" introduziu um bug onde
-- registros legados (month_ref NULL) vazavam para todos os meses no filtro,
-- causando duplicação após o primeiro clone ao fechar o mês.
--
-- Esta migração corrige o estado de cada cliente:
--   1) Detecta o D-0 do cliente (primeiro mês com fechamento ou primeiro mês
--      com registros não-nulos, ou current month como fallback).
--   2) Atribui o D-0 aos registros NULL (income, expenses, debts, assets, insurance, goals).
--   3) Para cada (client, próximo mês), remove duplicatas que tenham o mesmo
--      "fingerprint" de um registro do mês anterior.

DO $$
DECLARE
  c            RECORD;
  baseline     date;
  current_m    date := date_trunc('month', CURRENT_DATE)::date;
BEGIN
  FOR c IN SELECT id FROM public.clients LOOP

    -- ── 1. Detecta o D-0 do cliente ─────────────────────────────────
    -- prioridade: monthly_closings.month_ref MIN → primeiro mês com dados → current month
    SELECT MIN(month_ref)::date INTO baseline FROM (
      SELECT month_ref FROM public.monthly_closings WHERE client_id = c.id
      UNION ALL
      SELECT month_ref FROM public.income WHERE client_id = c.id AND month_ref IS NOT NULL
      UNION ALL
      SELECT month_ref FROM public.expenses WHERE client_id = c.id AND month_ref IS NOT NULL
      UNION ALL
      SELECT month_ref FROM public.debts WHERE client_id = c.id AND month_ref IS NOT NULL
      UNION ALL
      SELECT month_ref FROM public.assets WHERE client_id = c.id AND month_ref IS NOT NULL
      UNION ALL
      SELECT month_ref FROM public.insurance WHERE client_id = c.id AND month_ref IS NOT NULL
      UNION ALL
      SELECT month_ref FROM public.goals WHERE client_id = c.id AND month_ref IS NOT NULL
    ) AS all_months;

    IF baseline IS NULL THEN
      baseline := current_m;
    END IF;

    -- ── 2. Atribui D-0 aos registros NULL ──────────────────────────
    UPDATE public.income     SET month_ref = baseline WHERE client_id = c.id AND month_ref IS NULL;
    UPDATE public.expenses   SET month_ref = baseline WHERE client_id = c.id AND month_ref IS NULL;
    UPDATE public.debts      SET month_ref = baseline WHERE client_id = c.id AND month_ref IS NULL;
    UPDATE public.assets     SET month_ref = baseline WHERE client_id = c.id AND month_ref IS NULL;
    UPDATE public.insurance  SET month_ref = baseline WHERE client_id = c.id AND month_ref IS NULL;
    UPDATE public.goals      SET month_ref = baseline WHERE client_id = c.id AND month_ref IS NULL;

  END LOOP;
END $$;

-- ── 3. Remove duplicatas do mês seguinte ao D-0 ────────────────────
-- Cada (client, próximo mês) ganha apenas 1 cópia de cada item.
-- Identifica duplicatas pelo "fingerprint" (description+amount, etc) e mantém o mais antigo.

-- INCOME
DELETE FROM public.income a
USING public.income b
WHERE a.client_id = b.client_id
  AND a.month_ref = b.month_ref
  AND COALESCE(a.description, '') = COALESCE(b.description, '')
  AND a.amount = b.amount
  AND COALESCE(a.frequency::text, '') = COALESCE(b.frequency::text, '')
  AND a.id > b.id;

-- EXPENSES
DELETE FROM public.expenses a
USING public.expenses b
WHERE a.client_id = b.client_id
  AND a.month_ref = b.month_ref
  AND COALESCE(a.category, '') = COALESCE(b.category, '')
  AND COALESCE(a.description, '') = COALESCE(b.description, '')
  AND a.amount = b.amount
  AND a.id > b.id;

-- DEBTS
DELETE FROM public.debts a
USING public.debts b
WHERE a.client_id = b.client_id
  AND a.month_ref = b.month_ref
  AND COALESCE(a.type, '') = COALESCE(b.type, '')
  AND COALESCE(a.creditor, '') = COALESCE(b.creditor, '')
  AND a.total_amount = b.total_amount
  AND a.id > b.id;

-- ASSETS
DELETE FROM public.assets a
USING public.assets b
WHERE a.client_id = b.client_id
  AND a.month_ref = b.month_ref
  AND COALESCE(a.type, '') = COALESCE(b.type, '')
  AND COALESCE(a.description, '') = COALESCE(b.description, '')
  AND a.estimated_value = b.estimated_value
  AND a.id > b.id;

-- INSURANCE
DELETE FROM public.insurance a
USING public.insurance b
WHERE a.client_id = b.client_id
  AND a.month_ref = b.month_ref
  AND COALESCE(a.type, '') = COALESCE(b.type, '')
  AND COALESCE(a.provider, '') = COALESCE(b.provider, '')
  AND COALESCE(a.monthly_premium, 0) = COALESCE(b.monthly_premium, 0)
  AND a.id > b.id;

-- GOALS
DELETE FROM public.goals a
USING public.goals b
WHERE a.client_id = b.client_id
  AND a.month_ref = b.month_ref
  AND COALESCE(a.description, '') = COALESCE(b.description, '')
  AND COALESCE(a.target_amount, 0) = COALESCE(b.target_amount, 0)
  AND a.id > b.id;
