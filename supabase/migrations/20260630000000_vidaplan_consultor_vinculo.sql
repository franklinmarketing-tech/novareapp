-- Modelo híbrido consultor ↔ cliente do Vida Plan.
-- (1) vidaplan_consultores: quem é consultor (tem um código que o cliente digita).
-- (2) vidaplan_vinculos: o cliente liga-se a um consultor e deixa um snapshot do plano.

-- ── Consultores ─────────────────────────────────────────────────────────
create table if not exists public.vidaplan_consultores (
  consultor_id uuid primary key references auth.users(id) on delete cascade,
  codigo text unique not null,
  nome text,
  empresa text,
  updated_at timestamptz not null default now()
);
alter table public.vidaplan_consultores enable row level security;

-- qualquer usuário autenticado pode CONSULTAR (para achar o consultor pelo código)
drop policy if exists "consultores_select_auth" on public.vidaplan_consultores;
create policy "consultores_select_auth" on public.vidaplan_consultores
  for select to authenticated using (true);

drop policy if exists "consultores_upsert_own" on public.vidaplan_consultores;
create policy "consultores_insert_own" on public.vidaplan_consultores
  for insert to authenticated with check (auth.uid() = consultor_id);
create policy "consultores_update_own" on public.vidaplan_consultores
  for update to authenticated using (auth.uid() = consultor_id) with check (auth.uid() = consultor_id);

-- ── Vínculos (cliente → consultor) ──────────────────────────────────────
create table if not exists public.vidaplan_vinculos (
  cliente_id uuid primary key references auth.users(id) on delete cascade,
  consultor_id uuid not null references auth.users(id) on delete cascade,
  cliente_nome text,
  snapshot jsonb,
  updated_at timestamptz not null default now()
);
alter table public.vidaplan_vinculos enable row level security;

-- o cliente lê/gerencia o próprio vínculo; o consultor lê os vínculos dele
drop policy if exists "vinculos_select" on public.vidaplan_vinculos;
create policy "vinculos_select" on public.vidaplan_vinculos
  for select to authenticated using (auth.uid() = cliente_id or auth.uid() = consultor_id);

drop policy if exists "vinculos_cliente_insert" on public.vidaplan_vinculos;
create policy "vinculos_cliente_insert" on public.vidaplan_vinculos
  for insert to authenticated with check (auth.uid() = cliente_id);
create policy "vinculos_cliente_update" on public.vidaplan_vinculos
  for update to authenticated using (auth.uid() = cliente_id) with check (auth.uid() = cliente_id);
create policy "vinculos_cliente_delete" on public.vidaplan_vinculos
  for delete to authenticated using (auth.uid() = cliente_id);

create index if not exists vidaplan_vinculos_consultor_idx on public.vidaplan_vinculos (consultor_id);
