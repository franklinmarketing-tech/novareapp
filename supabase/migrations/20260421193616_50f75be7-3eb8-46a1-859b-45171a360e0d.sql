-- Allow super admins to insert clients (for creation flow)
CREATE POLICY "Super admins can insert clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

-- Allow super admins to update profiles (for edit flow)
CREATE POLICY "Super admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));