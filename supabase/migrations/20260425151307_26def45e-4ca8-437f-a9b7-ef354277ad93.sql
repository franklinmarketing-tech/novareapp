
-- ============================================================
-- Bucket de PDFs gerados pela calculadora
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('calculator-pdfs', 'calculator-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Apenas admins/super_admins podem ler PDFs
CREATE POLICY "Admins can read calculator PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'calculator-pdfs'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

-- Edge function (service-role) faz uploads; usuários comuns não
CREATE POLICY "Admins can manage calculator PDFs"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'calculator-pdfs'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
);

-- ============================================================
-- Tabela: pdf_leads (cada cliente que pediu o PDF)
-- ============================================================
CREATE TABLE public.pdf_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  source TEXT NOT NULL DEFAULT 'calculadora',
  status TEXT NOT NULL DEFAULT 'new', -- new | responded | archived
  reply_count INTEGER NOT NULL DEFAULT 0,
  message_count INTEGER NOT NULL DEFAULT 0,
  inbound_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  last_replied_at TIMESTAMPTZ,
  last_inbound_at TIMESTAMPTZ,
  pdf_url TEXT,                -- caminho dentro do bucket (calculator-pdfs/...)
  pdf_filename TEXT,
  simulation_snapshot JSONB,   -- inputs + resultados resumidos
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pdf_leads_email ON public.pdf_leads(email);
CREATE INDEX idx_pdf_leads_status ON public.pdf_leads(status);
CREATE INDEX idx_pdf_leads_created_at ON public.pdf_leads(created_at DESC);

-- updated_at trigger
CREATE TRIGGER set_pdf_leads_updated_at
BEFORE UPDATE ON public.pdf_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.pdf_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view pdf leads"
ON public.pdf_leads FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Admins can update pdf leads"
ON public.pdf_leads FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

-- INSERT é feito apenas pela edge function (service role bypassa RLS),
-- portanto NÃO criamos política de insert pública.

-- ============================================================
-- Tabela: pdf_lead_messages (thread admin <-> cliente)
-- ============================================================
CREATE TABLE public.pdf_lead_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.pdf_leads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  -- outbound = admin -> cliente; inbound = cliente -> admin (resposta)
  sender_user_id UUID,         -- admin que enviou (outbound) ou null (inbound)
  sender_email TEXT,           -- e-mail de origem
  recipient_email TEXT,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,     -- texto puro
  body_html TEXT,              -- versão html (quando vier do webhook)
  email_status TEXT NOT NULL DEFAULT 'sent', -- sent | failed | received
  error_message TEXT,
  resend_message_id TEXT,      -- id do Resend (para Reply-To threading)
  has_attachment_pdf BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pdf_lead_messages_lead_id ON public.pdf_lead_messages(lead_id, created_at DESC);
CREATE INDEX idx_pdf_lead_messages_direction ON public.pdf_lead_messages(direction);

ALTER TABLE public.pdf_lead_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view pdf lead messages"
ON public.pdf_lead_messages FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);
-- INSERT/UPDATE feitos por edge functions (service role)
