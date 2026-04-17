
CREATE TABLE public.data_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  month_ref date NOT NULL,
  notes text,
  UNIQUE(client_id, month_ref)
);

ALTER TABLE public.data_confirmations ENABLE ROW LEVEL SECURITY;

-- Clients can view their own confirmations
CREATE POLICY "Clients can view own confirmations"
ON public.data_confirmations FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.clients
  WHERE clients.id = data_confirmations.client_id
  AND clients.user_id = auth.uid()
));

-- Clients can insert their own confirmations
CREATE POLICY "Clients can insert own confirmations"
ON public.data_confirmations FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.clients
  WHERE clients.id = data_confirmations.client_id
  AND clients.user_id = auth.uid()
));

-- Admins can view all confirmations
CREATE POLICY "Admins can view all confirmations"
ON public.data_confirmations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
