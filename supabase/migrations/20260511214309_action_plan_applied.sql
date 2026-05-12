-- V9: Plano de Acao reformulado (Plano A/B/C)
--
-- O novo fluxo do Plano de Acao no admin permite ao consultor:
-- 1. Abrir um popup, escolher um Parecer de referencia (opcional),
--    definir um objetivo e dar instrucoes customizadas a IA
-- 2. A IA retorna 3 planos completos (Plano A / B / C), cada um com
--    estrategia propria, horizonte e lista de acoes
-- 3. O consultor aplica UM dos 3, que vira o plano "em andamento"
--
-- Estes campos guardam o estado do plano aplicado e o payload das 3
-- opcoes geradas (permite revisitar sem chamar a IA de novo).

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
