-- Formulário público de Objetivos de Vida (lead capture)
-- Tabelas: life_leads, life_lead_goals, life_lead_updates

create table public.life_leads (
  id uuid primary key default gen_random_uuid(),
  -- Passo 1: Você
  name text not null,
  birth_date date,
  marital_status text,
  dependents text,
  profession text,
  email text,
  whatsapp text,
  source text,
  -- Passo 2: Finanças
  monthly_income_range text,
  invested_amount_range text,
  monthly_savings_range text,
  has_debts text,
  investment_types text[],
  financial_feelings text,
  -- Passo 4: Perfil
  loss_reaction text,
  loss_tolerance_pct int default 5,
  main_motivation text[],
  past_attempts text,
  -- Passo 5: Observação final
  final_notes text,
  -- Meta
  status text not null default 'novo',
  created_at timestamptz not null default now()
);

create table public.life_lead_goals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.life_leads(id) on delete cascade,
  goal_type text not null,
  target_value numeric,
  deadline_years int,
  current_value numeric default 0,
  priority text default 'media',
  notes text,
  created_at timestamptz not null default now()
);

create table public.life_lead_updates (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.life_leads(id) on delete cascade,
  goal_id uuid references public.life_lead_goals(id) on delete set null,
  note text not null,
  progress_pct int,
  current_value numeric,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.life_leads enable row level security;
alter table public.life_lead_goals enable row level security;
alter table public.life_lead_updates enable row level security;

-- Qualquer pessoa pode enviar o formulário público
create policy "Public can insert leads" on public.life_leads
  for insert with check (true);

-- Admins podem ler e gerenciar leads
create policy "Admins can manage leads" on public.life_leads
  for all to authenticated using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

-- Qualquer pessoa pode inserir objetivos (como parte do formulário)
create policy "Public can insert lead goals" on public.life_lead_goals
  for insert with check (true);

create policy "Admins can manage lead goals" on public.life_lead_goals
  for all to authenticated using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );

create policy "Admins can manage lead updates" on public.life_lead_updates
  for all to authenticated using (
    exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );
