-- Metas definidas pelo consultor para cada item financeiro do cliente.
-- Uma meta por item (source_table + source_id), com sugestão da IA armazenada separada.

CREATE TABLE IF NOT EXISTS public.parecer_metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source_table text NOT NULL, -- 'income' | 'expenses' | 'debts' | 'assets' | 'goals'
  source_id uuid NOT NULL,
  source_label text NOT NULL,
  current_value numeric,
  meta_text text,
  meta_valor numeric,
  ai_suggestion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, source_table, source_id)
);

ALTER TABLE public.parecer_metas ENABLE ROW LEVEL SECURITY;

-- Admin lê e edita metas dos seus clientes
CREATE POLICY "admin_all_parecer_metas"
  ON public.parecer_metas FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Cliente lê suas próprias metas
CREATE POLICY "client_read_own_parecer_metas"
  ON public.parecer_metas FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE id = parecer_metas.client_id AND user_id = auth.uid()
    )
  );
