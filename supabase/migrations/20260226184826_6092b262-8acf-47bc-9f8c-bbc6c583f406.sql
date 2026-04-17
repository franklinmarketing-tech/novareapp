
-- Create investment_recommendations table
CREATE TABLE public.investment_recommendations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  product_type text NOT NULL DEFAULT 'renda_fixa',
  allocation_pct numeric NOT NULL DEFAULT 0,
  expected_return text,
  risk_level text NOT NULL DEFAULT 'baixo',
  liquidity text,
  min_investment numeric DEFAULT 0,
  rationale text,
  status text NOT NULL DEFAULT 'pendente',
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.investment_recommendations ENABLE ROW LEVEL SECURITY;

-- Admin full CRUD
CREATE POLICY "Admins can view all recommendations" ON public.investment_recommendations
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert recommendations" ON public.investment_recommendations
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update recommendations" ON public.investment_recommendations
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete recommendations" ON public.investment_recommendations
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Clients can view own
CREATE POLICY "Clients can view own recommendations" ON public.investment_recommendations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = investment_recommendations.client_id
        AND clients.user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_investment_recommendations_updated_at
  BEFORE UPDATE ON public.investment_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
