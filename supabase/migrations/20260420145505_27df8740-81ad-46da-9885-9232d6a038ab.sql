-- 1) Remove o papel 'admin' de qualquer usuário que também seja super_admin
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'super_admin');

-- 2) has_role volta a ser estrito (sem herança)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;