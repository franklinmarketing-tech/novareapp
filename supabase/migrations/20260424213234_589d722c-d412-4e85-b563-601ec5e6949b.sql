-- Tabela de leads da newsletter
CREATE TABLE public.newsletter_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  source TEXT NOT NULL DEFAULT 'yield-guide',
  status TEXT NOT NULL DEFAULT 'new',
  ip_address TEXT,
  user_agent TEXT,
  reply_count INTEGER NOT NULL DEFAULT 0,
  last_replied_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email único por lead
CREATE UNIQUE INDEX idx_newsletter_leads_email ON public.newsletter_leads (lower(email));
CREATE INDEX idx_newsletter_leads_created ON public.newsletter_leads (created_at DESC);
CREATE INDEX idx_newsletter_leads_status ON public.newsletter_leads (status);

-- Tabela de respostas enviadas
CREATE TABLE public.newsletter_lead_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.newsletter_leads(id) ON DELETE CASCADE,
  replied_by_user_id UUID NOT NULL,
  replied_by_email TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_newsletter_replies_lead ON public.newsletter_lead_replies (lead_id, created_at DESC);

-- RLS
ALTER TABLE public.newsletter_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_lead_replies ENABLE ROW LEVEL SECURITY;

-- Policies: leads
CREATE POLICY "Public can insert leads"
  ON public.newsletter_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all leads"
  ON public.newsletter_leads
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update leads"
  ON public.newsletter_leads
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Policies: replies
CREATE POLICY "Admins can view replies"
  ON public.newsletter_lead_replies
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert replies"
  ON public.newsletter_lead_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
    AND auth.uid() = replied_by_user_id
  );

-- Trigger para updated_at
CREATE TRIGGER update_newsletter_leads_updated_at
  BEFORE UPDATE ON public.newsletter_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();