-- V9: Parecer com referencias aos dados do onboarding
--
-- Cada vez que o consultor clica em "+" no painel "Alinhamento Consultivo"
-- (AdminParecer), um chip eh inserido no editor referenciando um item ou um
-- grupo de itens do onboarding (cliente / renda / despesas / dividas /
-- patrimonio / seguros / objetivos). O snapshot do valor naquele momento
-- precisa ser preservado mesmo que o registro original mude depois.
--
-- A coluna snapshots armazena esses chips em formato JSON, na forma:
-- [
--   {
--     "chip_id": "uuid-do-chip",
--     "source": "expense",
--     "kind": "item" | "group",
--     "label": "Aluguel",
--     "value": 3000,
--     "meta": { "category": "moradia", ... },
--     "captured_at": "2026-05-11T21:31:40Z"
--   },
--   ...
-- ]
--
-- A IA (edge function analyze-notes) recebe esse array como contexto.

ALTER TABLE public.consultant_notes
  ADD COLUMN IF NOT EXISTS snapshots jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.consultant_notes.snapshots IS
  'Lista de chips inseridos no parecer referenciando dados do onboarding. Imutavel apos insercao.';
