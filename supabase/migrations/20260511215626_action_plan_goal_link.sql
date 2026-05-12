-- V9: Plano de Acao sempre vinculado a um Objetivo
--
-- Cada plano aplicado precisa estar entrelacado a um objetivo (goals).
-- Isso garante que a IA gere o plano focada num alvo concreto e que o
-- consultor consiga rastrear o progresso por objetivo no Acompanhamento.
-- A coluna ja existe em action_items.goal_id, mas em action_plans nao
-- existia. Adicionamos como nullable para nao quebrar planos antigos.

ALTER TABLE public.action_plans
  ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.action_plans.goal_id IS
  'Objetivo (goals) ao qual este plano esta entrelacado. Definido no popup de geracao da IA.';
