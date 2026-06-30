-- Visão da Novare (super-admin): ler os vínculos p/ contar clientes por consultor.
-- (vidaplan_consultores já é legível por qualquer autenticado.)
drop policy if exists "vinculos_admin_read" on public.vidaplan_vinculos;
create policy "vinculos_admin_read" on public.vidaplan_vinculos
  for select to authenticated using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role in ('admin','super_admin'))
  );
