
-- Drop and recreate to handle idempotency
DROP POLICY IF EXISTS "Clients can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Clients can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Clients can delete own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Clients can insert own debts" ON public.debts;
DROP POLICY IF EXISTS "Clients can update own debts" ON public.debts;
DROP POLICY IF EXISTS "Clients can delete own debts" ON public.debts;
DROP POLICY IF EXISTS "Clients can insert own confirmations" ON public.data_confirmations;
DROP POLICY IF EXISTS "Clients can view own confirmations" ON public.data_confirmations;
DROP POLICY IF EXISTS "Admins can view all confirmations" ON public.data_confirmations;
DROP POLICY IF EXISTS "Clients can view own notes" ON public.consultant_notes;

CREATE POLICY "Clients can insert own expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = expenses.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Clients can update own expenses" ON public.expenses FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = expenses.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Clients can delete own expenses" ON public.expenses FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = expenses.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Clients can insert own debts" ON public.debts FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = debts.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Clients can update own debts" ON public.debts FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = debts.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Clients can delete own debts" ON public.debts FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = debts.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Clients can insert own confirmations" ON public.data_confirmations FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = data_confirmations.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Clients can view own confirmations" ON public.data_confirmations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = data_confirmations.client_id AND clients.user_id = auth.uid()));
CREATE POLICY "Admins can view all confirmations" ON public.data_confirmations FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
