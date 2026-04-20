-- Promover admin mais antigo a super_admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('770c11eb-20dd-45bf-8740-331b7890bf39', 'super_admin')
ON CONFLICT DO NOTHING;

-- Função helper
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- AUDIT LOG
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  changes jsonb,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_actor ON public.audit_log(actor_user_id);
CREATE INDEX idx_audit_log_resource ON public.audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can view audit log" ON public.audit_log FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Authenticated can insert audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- FEATURE FLAGS
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  rollout_pct integer NOT NULL DEFAULT 0 CHECK (rollout_pct >= 0 AND rollout_pct <= 100),
  target_roles text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view feature flags" ON public.feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage feature flags" ON public.feature_flags FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.feature_flags (key, name, description, enabled) VALUES
  ('new_dashboard', 'Novo Dashboard', 'Habilita o novo dashboard com gráficos avançados', false),
  ('ai_notes', 'IA em Notas', 'Análise automática de notas com IA', false),
  ('beta_reports', 'Relatórios Beta', 'Acesso aos novos formatos de relatório', false),
  ('advanced_charts', 'Gráficos Avançados', 'Habilita gráficos interativos e drill-down', false);

-- ADMIN INVITATIONS
CREATE TABLE public.admin_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role app_role NOT NULL,
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_invitations_email ON public.admin_invitations(email);
CREATE INDEX idx_admin_invitations_token ON public.admin_invitations(token);
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage invitations" ON public.admin_invitations FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- APP GLOBAL CONFIG
CREATE TABLE public.app_global_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  max_clients_per_admin integer NOT NULL DEFAULT 100,
  max_storage_mb_per_client integer NOT NULL DEFAULT 500,
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text,
  allowed_email_domains text[] DEFAULT ARRAY[]::text[],
  integrations jsonb NOT NULL DEFAULT '{"resend":true,"openai":true,"lovable_ai":true}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.app_global_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view global config" ON public.app_global_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins update global config" ON public.app_global_config FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins insert global config" ON public.app_global_config FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER update_app_global_config_updated_at BEFORE UPDATE ON public.app_global_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.app_global_config (id) VALUES (1) ON CONFLICT DO NOTHING;

-- SYSTEM BACKUPS
CREATE TABLE public.system_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL,
  scope text NOT NULL,
  format text NOT NULL DEFAULT 'json' CHECK (format IN ('json','csv','zip')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  file_url text,
  file_size_bytes bigint,
  error_message text,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage backups" ON public.system_backups FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- has_role atualizado: super_admin herda permissões de admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = _role OR (_role = 'admin' AND role = 'super_admin'))
  )
$$;

-- Super admins podem deletar clientes
CREATE POLICY "Super admins can delete clients" ON public.clients FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));

-- Super admins gerenciam todos os roles
CREATE POLICY "Super admins manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- Trigger genérico de auditoria
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
  _email text;
  _action text;
  _changes jsonb;
BEGIN
  IF _actor IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT email INTO _email FROM public.profiles WHERE user_id = _actor LIMIT 1;
  IF TG_OP = 'INSERT' THEN
    _action := 'create'; _changes := jsonb_build_object('after', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'update'; _changes := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'delete'; _changes := jsonb_build_object('before', to_jsonb(OLD));
  END IF;
  INSERT INTO public.audit_log (actor_user_id, actor_email, action, resource_type, resource_id, changes)
  VALUES (_actor, _email, _action, TG_TABLE_NAME, COALESCE(NEW.id::text, OLD.id::text), _changes);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_feature_flags AFTER INSERT OR UPDATE OR DELETE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
CREATE TRIGGER audit_app_global_config AFTER UPDATE ON public.app_global_config FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();