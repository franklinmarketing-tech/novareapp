-- Admins podem inserir papéis (exceto super_admin)
CREATE POLICY "Admins can insert non-super-admin roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND role <> 'super_admin'
);

-- Admins podem atualizar papéis (não pode promover ninguém para super_admin nem alterar super_admin)
CREATE POLICY "Admins can update non-super-admin roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND role <> 'super_admin'
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND role <> 'super_admin'
);

-- Admins podem remover papéis (exceto de super_admins)
CREATE POLICY "Admins can delete non-super-admin roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND role <> 'super_admin'
);