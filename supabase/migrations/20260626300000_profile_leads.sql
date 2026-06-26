-- Teste de Perfil de Investidor / Suitability (lead capture)

create table public.profile_leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  whatsapp text,
  perfil text,
  score int,
  status text not null default 'novo',
  created_at timestamptz not null default now()
);

alter table public.profile_leads enable row level security;

create policy "Public can insert profile leads" on public.profile_leads
  for insert with check (true);

create policy "Admins can manage profile leads" on public.profile_leads
  for all to authenticated using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );
