-- Adiciona completed_at à tabela goals para registrar quando uma meta foi atingida e arquivada
ALTER TABLE goals ADD COLUMN IF NOT EXISTS completed_at timestamptz DEFAULT NULL;
