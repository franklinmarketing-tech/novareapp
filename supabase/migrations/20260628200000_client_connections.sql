-- Multi-tenant Open Finance: mapeia cada conexão bancária ao cliente dono.
-- Provider-agnóstico (banco_mcp hoje, pluggy/B2B depois). Garante isolamento:
-- o cliente só enxerga os item_id ligados a ele.

create table public.client_connections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  provider text not null default 'banco_mcp',
  external_user_id text,            -- id do end-user no provedor (futuro: Pluggy/B2B)
  item_id text not null,            -- id da conexão bancária no provedor
  connector_name text,
  status text,
  created_at timestamptz not null default now(),
  unique (item_id)                  -- uma conexão pertence a um único cliente
);

create index client_connections_client_idx on public.client_connections(client_id);

alter table public.client_connections enable row level security;

-- Cliente gerencia apenas as próprias conexões (via clients.user_id = auth.uid())
create policy "Clients manage own connections" on public.client_connections
  for all to authenticated
  using (exists (select 1 from public.clients c where c.id = client_connections.client_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.clients c where c.id = client_connections.client_id and c.user_id = auth.uid()));

-- Admins gerenciam tudo
create policy "Admins manage all connections" on public.client_connections
  for all to authenticated using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','super_admin'))
  );
