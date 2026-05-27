-- Bloco de notas por categoria no Plano de Ação ("Ver Ações").
-- Uma nota contínua por (client_id, category) — o consultor edita
-- sempre a mesma nota; o cliente vê em modo leitura.

CREATE TABLE IF NOT EXISTS public.acao_notas (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category    text        NOT NULL CHECK (category IN ('income','expenses','debts','assets','insurance','goals')),
  content     text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, category)
);

CREATE INDEX IF NOT EXISTS idx_acao_notas_client
  ON public.acao_notas(client_id);

-- Trigger de updated_at (função já existe — criada em 20260226013729)
DROP TRIGGER IF EXISTS update_acao_notas_updated_at ON public.acao_notas;
CREATE TRIGGER update_acao_notas_updated_at
  BEFORE UPDATE ON public.acao_notas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.acao_notas ENABLE ROW LEVEL SECURITY;

-- Admin pode tudo
CREATE POLICY "admin_all_acao_notas"
  ON public.acao_notas FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Cliente só lê suas próprias notas
CREATE POLICY "client_read_own_acao_notas"
  ON public.acao_notas FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.clients WHERE id = acao_notas.client_id AND user_id = auth.uid())
  );
