-- Calculadora de Aposentadoria / Independência Financeira (lead capture)
-- Captura e-mail antes de liberar o resultado completo.

create table public.retirement_leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  whatsapp text,
  -- Parâmetros da simulação (contexto para o consultor)
  idade_atual int,
  idade_aposentadoria int,
  renda_desejada numeric,
  patrimonio_atual numeric,
  aporte_mensal numeric,
  rentabilidade_real numeric,
  -- Resultados headline
  fire_number numeric,
  patrimonio_projetado numeric,
  idade_independencia int,
  -- Meta
  status text not null default 'novo',
  created_at timestamptz not null default now()
);

alter table public.retirement_leads enable row level security;

create policy "Public can insert retirement leads" on public.retirement_leads
  for insert with check (true);

create policy "Admins can manage retirement leads" on public.retirement_leads
  for all to authenticated using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );
