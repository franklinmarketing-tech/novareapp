
-- Implementation sessions table
CREATE TABLE public.implementation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('ajuste_orcamento', 'renegociacao_dividas', 'organizacao_reservas', 'estruturacao_investimentos', 'ajustes_tributarios', 'educacao_financeira')),
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
  session_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.implementation_sessions ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can view all sessions" ON public.implementation_sessions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert sessions" ON public.implementation_sessions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update sessions" ON public.implementation_sessions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete sessions" ON public.implementation_sessions FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Clients can view own sessions
CREATE POLICY "Clients can view own sessions" ON public.implementation_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.clients WHERE clients.id = implementation_sessions.client_id AND clients.user_id = auth.uid())
);
