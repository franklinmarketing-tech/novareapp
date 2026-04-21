-- Permite que admins excluam clientes (super admins já tinham essa permissão)
CREATE POLICY "Admins can delete clients"
ON public.clients FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));