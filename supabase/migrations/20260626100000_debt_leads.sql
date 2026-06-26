-- Saia do Vermelho — calculadora de quitação de dívidas (lead capture)

create table public.debt_leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  whatsapp text,
  -- Contexto da simulação
  total_divida numeric,
  num_dividas int,
  extra_mensal numeric,
  -- Resultados (meses e juros por estratégia)
  meses_avalanche int,
  juros_avalanche numeric,
  meses_snowball int,
  juros_snowball numeric,
  -- Meta
  status text not null default 'novo',
  created_at timestamptz not null default now()
);

alter table public.debt_leads enable row level security;

create policy "Public can insert debt leads" on public.debt_leads
  for insert with check (true);

create policy "Admins can manage debt leads" on public.debt_leads
  for all to authenticated using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );
