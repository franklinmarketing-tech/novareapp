-- Novare Vida Plan: 1 plano de vida por usuário (inputs + objetivos em JSON).
-- Cada usuário só enxerga e edita o próprio plano.

create table if not exists public.vidaplan_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.vidaplan_plans enable row level security;

drop policy if exists "Users manage own vida plan" on public.vidaplan_plans;
create policy "Users manage own vida plan" on public.vidaplan_plans
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
