-- 1. IP allowlist
CREATE TABLE IF NOT EXISTS public.ip_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  ip_address text NOT NULL,
  label text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ip_allowlist_user ON public.ip_allowlist(user_id);
CREATE INDEX IF NOT EXISTS idx_ip_allowlist_ip ON public.ip_allowlist(ip_address);

-- 2. Security alerts
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL CHECK (severity IN ('info','warning','critical')),
  category text NOT NULL,
  title text NOT NULL,
  description text,
  user_id uuid,
  user_email text,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created ON public.security_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_unresolved ON public.security_alerts(resolved, created_at DESC) WHERE resolved = false;

-- 3. Broadcast messages
CREATE TABLE IF NOT EXISTS public.broadcast_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical','success')),
  target_roles text[] DEFAULT ARRAY['admin','client','super_admin']::text[],
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  link_url text,
  link_label text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_broadcast_active ON public.broadcast_messages(active, expires_at);

-- 4. Super admin actions log
CREATE TABLE IF NOT EXISTS public.super_admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  actor_email text,
  action text NOT NULL,
  target_type text,
  target_id text,
  target_email text,
  reason text,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_super_admin_actions_created ON public.super_admin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_super_admin_actions_actor ON public.super_admin_actions(actor_user_id);

-- 5. Banned users
CREATE TABLE IF NOT EXISTS public.banned_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  reason text NOT NULL,
  banned_by uuid NOT NULL,
  banned_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_banned_users_until ON public.banned_users(banned_until);

-- 6. Extra config flags
ALTER TABLE public.app_global_config
  ADD COLUMN IF NOT EXISTS readonly_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS readonly_message text,
  ADD COLUMN IF NOT EXISTS ip_allowlist_enforced boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_password_for_destructive boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS failed_login_threshold int NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS failed_login_window_minutes int NOT NULL DEFAULT 15;

-- Enable RLS
ALTER TABLE public.ip_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

-- Policies: ip_allowlist
DROP POLICY IF EXISTS "Super admins manage ip allowlist" ON public.ip_allowlist;
CREATE POLICY "Super admins manage ip allowlist" ON public.ip_allowlist
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Policies: security_alerts
DROP POLICY IF EXISTS "Super admins read security alerts" ON public.security_alerts;
CREATE POLICY "Super admins read security alerts" ON public.security_alerts
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Super admins update security alerts" ON public.security_alerts;
CREATE POLICY "Super admins update security alerts" ON public.security_alerts
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Authenticated insert security alerts" ON public.security_alerts;
CREATE POLICY "Authenticated insert security alerts" ON public.security_alerts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Policies: broadcast_messages
DROP POLICY IF EXISTS "Authenticated read broadcasts" ON public.broadcast_messages;
CREATE POLICY "Authenticated read broadcasts" ON public.broadcast_messages
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Super admins manage broadcasts" ON public.broadcast_messages;
CREATE POLICY "Super admins manage broadcasts" ON public.broadcast_messages
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Policies: super_admin_actions
DROP POLICY IF EXISTS "Super admins read actions" ON public.super_admin_actions;
CREATE POLICY "Super admins read actions" ON public.super_admin_actions
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Super admins insert actions" ON public.super_admin_actions;
CREATE POLICY "Super admins insert actions" ON public.super_admin_actions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Policies: banned_users
DROP POLICY IF EXISTS "Super admins manage bans" ON public.banned_users;
CREATE POLICY "Super admins manage bans" ON public.banned_users
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Users see own ban" ON public.banned_users;
CREATE POLICY "Users see own ban" ON public.banned_users
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 7. Helper RPCs
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.banned_users
    WHERE user_id = _user_id
      AND (banned_until IS NULL OR banned_until > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.get_active_broadcasts(_role text)
RETURNS SETOF public.broadcast_messages
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.broadcast_messages
  WHERE active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (_role = ANY(target_roles))
  ORDER BY
    CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 WHEN 'success' THEN 3 ELSE 4 END,
    created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.is_ip_allowed(_user_id uuid, _ip text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _enforced boolean;
  _has_entries boolean;
BEGIN
  SELECT ip_allowlist_enforced INTO _enforced FROM public.app_global_config WHERE id = 1;
  IF NOT COALESCE(_enforced, false) THEN RETURN true; END IF;
  SELECT EXISTS (SELECT 1 FROM public.ip_allowlist WHERE user_id = _user_id OR user_id IS NULL) INTO _has_entries;
  IF NOT _has_entries THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.ip_allowlist
    WHERE (user_id = _user_id OR user_id IS NULL) AND ip_address = _ip
  );
END;
$$;

-- 8. Update is_super_admin to also block banned users
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.banned_users
    WHERE user_id = _user_id AND (banned_until IS NULL OR banned_until > now())
  );
$$;