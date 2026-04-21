CREATE POLICY "Super admins can view all clients"
ON public.clients
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()));