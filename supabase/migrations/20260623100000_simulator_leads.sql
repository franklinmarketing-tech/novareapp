-- Simulador de Renda Fixa (lead capture estilo Nomad)
-- Captura e-mail antes de liberar o resultado da simulação.

create table public.simulator_leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  whatsapp text,
  -- Parâmetros da simulação (contexto para o consultor)
  valor_inicial numeric,
  aporte_mensal numeric,
  prazo_meses int,
  pct_cdi numeric,
  tipo_principal text,
  -- Resultado headline
  resultado_liquido numeric,
  -- Meta
  status text not null default 'novo',
  created_at timestamptz not null default now()
);

alter table public.simulator_leads enable row level security;

-- Qualquer pessoa pode enviar (formulário público)
create policy "Public can insert simulator leads" on public.simulator_leads
  for insert with check (true);

-- Admins podem ler e gerenciar
create policy "Admins can manage simulator leads" on public.simulator_leads
  for all to authenticated using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role in ('admin', 'super_admin')
    )
  );
