-- Tabela de sócios-fundadores (gerenciada pelo admin, leitura pública)
CREATE TABLE public.founders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  short_name text NOT NULL,
  certs text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'Sócio-fundador',
  short_bio text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  image_url text,
  linkedin_url text,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.founders ENABLE ROW LEVEL SECURITY;

-- Leitura pública (mesmo sem login) — é vitrine institucional
CREATE POLICY "Founders are viewable by everyone"
  ON public.founders FOR SELECT
  USING (true);

-- Apenas admins podem inserir/editar/remover
CREATE POLICY "Admins can insert founders"
  ON public.founders FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update founders"
  ON public.founders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete founders"
  ON public.founders FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER update_founders_updated_at
  BEFORE UPDATE ON public.founders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_founders_display_order ON public.founders(display_order) WHERE active = true;

-- Seed inicial com os dois sócios atuais
INSERT INTO public.founders (slug, name, short_name, certs, role, short_bio, bio, linkedin_url, display_order, highlights) VALUES
('jefferson', 'Jefferson Freitas', 'Jefferson', 'CEA · CNEP-I · CFDe', 'Sócio-fundador', 'Consultor Wealth de Investimentos',
 'Com experiência nas maiores plataformas do mercado, Jefferson se especializou em planejamento patrimonial e estratégias de longo prazo para famílias e empresários de alta renda.',
 'https://www.linkedin.com/in/jeffersonfreitas', 0,
 '[
   {"icon":"Briefcase","text":"Ex-Santander (Especialista Van Gogh / Select) e XP Inc."},
   {"icon":"TrendingUp","text":"+R$ 40 milhões em captação líquida em um único ano"},
   {"icon":"GraduationCap","text":"MBA PAAP CNEP-I · Aprovado CNPI (Conteúdo Brasileiro)"},
   {"icon":"Shield","text":"13 anos de voluntariado em Tesouraria na CCB"}
 ]'::jsonb),
('leonardo', 'Leonardo Freitas de Oliveira', 'Leonardo', 'CEA', 'Sócio-fundador', 'Consultor Wealth de Investimentos',
 'Leonardo construiu sua carreira liderando equipes de alta performance e atendendo clientes de alta renda. Especialista em alocação estratégica de ativos.',
 'https://www.linkedin.com/in/leonardofreitasdeoliveira', 1,
 '[
   {"icon":"Briefcase","text":"Ex-líder Triple AAA no Santander · Wave Capital (BTG)"},
   {"icon":"Users","text":"Liderou +20 profissionais na região de Limeira"},
   {"icon":"Award","text":"Quadrante A1+ recorrente — referência em assessoria"},
   {"icon":"GraduationCap","text":"Bacharel em Administração · ANCORD"}
 ]'::jsonb);

-- Bucket de storage para fotos dos sócios (público)
INSERT INTO storage.buckets (id, name, public) VALUES ('founders', 'founders', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Founder images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'founders');

CREATE POLICY "Admins can upload founder images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'founders' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update founder images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'founders' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete founder images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'founders' AND public.has_role(auth.uid(), 'admin'));