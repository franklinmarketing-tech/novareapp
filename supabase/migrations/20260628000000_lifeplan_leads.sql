-- Projeto de Vida Novare (lead capture)

create table public.lifeplan_leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  whatsapp text,
  idade_atual int,
  idade_aposentadoria int,
  renda_mensal numeric,
  patrimonio_atual numeric,
  capital_de_vida numeric,
  patrimonio_projetado numeric,
  pct_atingido numeric,
  viavel boolean,
  status text not null default 'novo',
  created_at timestamptz not null default now()
);

alter table public.lifeplan_leads enable row level security;

create policy "Public can insert lifeplan leads" on public.lifeplan_leads
  for insert with check (true);

create policy "Admins can manage lifeplan leads" on public.lifeplan_leads
  for all to authenticated using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );
