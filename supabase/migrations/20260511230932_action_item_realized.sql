-- V9: Tabela de Metas no Acompanhamento (V9 item 11)
--
-- O Acompanhamento precisa exibir, para cada acao do plano, o valor
-- REALIZADO pelo cliente (o quanto da meta foi atingido na pratica).
-- Esse campo eh de uso exclusivo do consultor (bloqueio de seguranca V9).

ALTER TABLE public.action_items
  ADD COLUMN IF NOT EXISTS realized_impact numeric;

COMMENT ON COLUMN public.action_items.realized_impact IS
  'Valor mensal realizado pelo cliente nesta acao (preenchido somente pelo consultor — V9 bloqueio de seguranca).';
