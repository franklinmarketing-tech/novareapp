-- Adiciona campo prazo à tabela parecer_metas
ALTER TABLE public.parecer_metas ADD COLUMN IF NOT EXISTS prazo date;
