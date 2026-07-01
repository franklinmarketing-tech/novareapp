-- White-label completo: logo e nome do sistema do consultor ficam legíveis pelo cliente
-- (a tabela vidaplan_consultores já é SELECT para qualquer autenticado).
alter table public.vidaplan_consultores
  add column if not exists logo text,        -- dataURL do logo do assessor
  add column if not exists logo_ratio real,  -- proporção do logo
  add column if not exists sistema text;      -- nome do sistema (substitui "Vida Plan")
