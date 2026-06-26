-- Score de Saúde Financeira (lead capture)

create table public.health_score_leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  whatsapp text,
  score int,
  grade text,
  renda numeric,
  gastos numeric,
  dividas numeric,
  reserva numeric,
  investe numeric,
  status text not null default 'novo',
  created_at timestamptz not null default now()
);

alter table public.health_score_leads enable row level security;

create policy "Public can insert health score leads" on public.health_score_leads
  for insert with check (true);

create policy "Admins can manage health score leads" on public.health_score_leads
  for all to authenticated using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );
