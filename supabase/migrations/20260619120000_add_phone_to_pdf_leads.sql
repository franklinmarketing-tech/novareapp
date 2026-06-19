-- ============================================================
-- Adiciona telefone (WhatsApp, opcional) aos leads da calculadora
-- ============================================================
ALTER TABLE public.pdf_leads
  ADD COLUMN IF NOT EXISTS phone TEXT;
