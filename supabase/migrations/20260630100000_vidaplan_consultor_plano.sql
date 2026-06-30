-- Plano do Consultor (white-label SaaS): status + teste grátis de 14 dias.
-- Ao virar consultor, a linha entra com plano 'trial' por 14 dias (defaults abaixo).
-- O webhook de cobrança (fase futura) muda plano_status para 'active'/'inactive'.
alter table public.vidaplan_consultores
  add column if not exists plano_status text not null default 'trial',
  add column if not exists trial_until timestamptz default (now() + interval '14 days');
