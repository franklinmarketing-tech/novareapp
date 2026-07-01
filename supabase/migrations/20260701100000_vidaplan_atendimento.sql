-- Atendimento do assessor por cliente: notas privadas + recomendação (o cliente vê a recomendação).
create table if not exists public.vidaplan_atendimento (
  consultor_id uuid not null references auth.users(id) on delete cascade,
  cliente_id uuid not null references auth.users(id) on delete cascade,
  notas text,
  recomendacao text,
  updated_at timestamptz not null default now(),
  primary key (consultor_id, cliente_id)
);
alter table public.vidaplan_atendimento enable row level security;

-- o assessor gerencia os próprios atendimentos
drop policy if exists "atendimento_consultor_all" on public.vidaplan_atendimento;
create policy "atendimento_consultor_all" on public.vidaplan_atendimento
  for all to authenticated using (auth.uid() = consultor_id) with check (auth.uid() = consultor_id);

-- o cliente lê o próprio atendimento (para ver a recomendação)
drop policy if exists "atendimento_cliente_read" on public.vidaplan_atendimento;
create policy "atendimento_cliente_read" on public.vidaplan_atendimento
  for select to authenticated using (auth.uid() = cliente_id);
