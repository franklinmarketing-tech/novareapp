-- Novare Vida Plan: assinatura por usuário (free / gold) com teste grátis.
-- Recursos premium (relatório PDF, gastos invisíveis, etc.) liberam quando
-- status = 'active' OU (status = 'trial' e trial_until no futuro).

create table if not exists public.vidaplan_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plano text not null default 'free',     -- 'free' | 'gold'
  status text not null default 'inactive',-- 'inactive' | 'trial' | 'active'
  trial_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.vidaplan_subscriptions enable row level security;

-- Usuário lê e cria a própria assinatura (para iniciar o teste grátis).
drop policy if exists "Users read own subscription" on public.vidaplan_subscriptions;
create policy "Users read own subscription" on public.vidaplan_subscriptions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users start own trial" on public.vidaplan_subscriptions;
create policy "Users start own trial" on public.vidaplan_subscriptions
  for insert to authenticated with check (auth.uid() = user_id);

-- Ativação paga (status 'active') é feita por admin (ou webhook via service role).
drop policy if exists "Admins manage subscriptions" on public.vidaplan_subscriptions;
create policy "Admins manage subscriptions" on public.vidaplan_subscriptions
  for all to authenticated using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','super_admin'))
  );
