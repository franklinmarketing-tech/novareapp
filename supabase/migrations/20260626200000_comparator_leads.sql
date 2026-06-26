-- Comparador de Investimentos (lead capture)

create table public.comparator_leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  whatsapp text,
  valor numeric,
  prazo_meses int,
  num_opcoes int,
  melhor_tipo text,
  melhor_liquido_aa numeric,
  status text not null default 'novo',
  created_at timestamptz not null default now()
);

alter table public.comparator_leads enable row level security;

create policy "Public can insert comparator leads" on public.comparator_leads
  for insert with check (true);

create policy "Admins can manage comparator leads" on public.comparator_leads
  for all to authenticated using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );
