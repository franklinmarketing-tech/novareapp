-- Open Finance para usuários do Vida Plan (self-service, sem row em `clients`).
-- Mapeia cada conexão bancária (item_id do Banco MCP) ao user_id.
-- A escrita/leitura é feita pela edge function (service role); RLS abaixo é higiene.
create table if not exists public.vidaplan_open_finance (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  connector_name text,
  status text,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
alter table public.vidaplan_open_finance enable row level security;

drop policy if exists "vpof_select_own" on public.vidaplan_open_finance;
create policy "vpof_select_own" on public.vidaplan_open_finance
  for select to authenticated using (auth.uid() = user_id);
