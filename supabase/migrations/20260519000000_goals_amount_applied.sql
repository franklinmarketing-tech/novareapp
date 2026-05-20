-- Adiciona coluna amount_applied à tabela goals
-- Representa o valor já investido/aplicado em direção ao objetivo
ALTER TABLE goals ADD COLUMN IF NOT EXISTS amount_applied numeric DEFAULT 0;
