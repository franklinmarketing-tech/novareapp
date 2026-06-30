-- Carteira de clientes do consultor (Painel do Consultor do Vida Plan).
-- Uma linha por consultor; a lista de clientes vai em `data` (jsonb).
create table if not exists public.vidaplan_clientes (
  consultor_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.vidaplan_clientes enable row level security;

drop policy if exists "vidaplan_clientes_select_own" on public.vidaplan_clientes;
drop policy if exists "vidaplan_clientes_insert_own" on public.vidaplan_clientes;
drop policy if exists "vidaplan_clientes_update_own" on public.vidaplan_clientes;

create policy "vidaplan_clientes_select_own" on public.vidaplan_clientes
  for select using (auth.uid() = consultor_id);
create policy "vidaplan_clientes_insert_own" on public.vidaplan_clientes
  for insert with check (auth.uid() = consultor_id);
create policy "vidaplan_clientes_update_own" on public.vidaplan_clientes
  for update using (auth.uid() = consultor_id) with check (auth.uid() = consultor_id);
