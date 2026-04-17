
-- Trigger to auto-create profile, client role, and client record on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.email, ''));
  
  -- Assign client role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  
  -- Create client record with onboarding_pendente
  INSERT INTO public.clients (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS: Clients can insert their own income/expenses/debts/assets/insurance/goals
CREATE POLICY "Clients can insert own income" ON public.income FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = income.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Clients can update own income" ON public.income FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = income.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Clients can delete own income" ON public.income FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = income.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Clients can insert own expenses" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = expenses.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Clients can update own expenses" ON public.expenses FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = expenses.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Clients can delete own expenses" ON public.expenses FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = expenses.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Clients can insert own debts" ON public.debts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = debts.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Clients can update own debts" ON public.debts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = debts.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Clients can delete own debts" ON public.debts FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = debts.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Clients can insert own assets" ON public.assets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = assets.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Clients can update own assets" ON public.assets FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = assets.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Clients can delete own assets" ON public.assets FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = assets.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Clients can insert own insurance" ON public.insurance FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = insurance.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Clients can update own insurance" ON public.insurance FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = insurance.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Clients can delete own insurance" ON public.insurance FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = insurance.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Clients can insert own goals" ON public.goals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = goals.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Clients can update own goals" ON public.goals FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = goals.client_id AND clients.user_id = auth.uid()));

CREATE POLICY "Clients can delete own goals" ON public.goals FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = goals.client_id AND clients.user_id = auth.uid()));
