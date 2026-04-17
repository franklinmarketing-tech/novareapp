
-- ================================================
-- 1. FIX PRIVILEGE ESCALATION: user_roles
-- Change from {public} to {authenticated} and add user_id check
-- ================================================

-- Drop existing vulnerable policies
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Recreate with {authenticated} only
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ================================================
-- 2. HARDEN ALL RLS POLICIES: {public} → {authenticated}
-- ================================================

-- clients
DROP POLICY IF EXISTS "Admins can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can update clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Clients can update own data" ON public.clients;
DROP POLICY IF EXISTS "Clients can view own data" ON public.clients;

CREATE POLICY "Admins can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update clients" ON public.clients FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all clients" ON public.clients FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Clients can update own data" ON public.clients FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Clients can view own data" ON public.clients FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- expenses (admin policies)
DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can view all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;

CREATE POLICY "Admins can delete expenses" ON public.expenses FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update expenses" ON public.expenses FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all expenses" ON public.expenses FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own expenses" ON public.expenses FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = expenses.client_id AND clients.user_id = auth.uid()));

-- debts (admin policies)
DROP POLICY IF EXISTS "Admins can delete debts" ON public.debts;
DROP POLICY IF EXISTS "Admins can insert debts" ON public.debts;
DROP POLICY IF EXISTS "Admins can update debts" ON public.debts;
DROP POLICY IF EXISTS "Admins can view all debts" ON public.debts;
DROP POLICY IF EXISTS "Users can view own debts" ON public.debts;

CREATE POLICY "Admins can delete debts" ON public.debts FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert debts" ON public.debts FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update debts" ON public.debts FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all debts" ON public.debts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own debts" ON public.debts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = debts.client_id AND clients.user_id = auth.uid()));

-- income (admin policies)
DROP POLICY IF EXISTS "Admins can delete income" ON public.income;
DROP POLICY IF EXISTS "Admins can insert income" ON public.income;
DROP POLICY IF EXISTS "Admins can update income" ON public.income;
DROP POLICY IF EXISTS "Admins can view all income" ON public.income;
DROP POLICY IF EXISTS "Users can view own income" ON public.income;

CREATE POLICY "Admins can delete income" ON public.income FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert income" ON public.income FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update income" ON public.income FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all income" ON public.income FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own income" ON public.income FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = income.client_id AND clients.user_id = auth.uid()));

-- profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- assets
DROP POLICY IF EXISTS "Admins can delete assets" ON public.assets;
DROP POLICY IF EXISTS "Admins can insert assets" ON public.assets;
DROP POLICY IF EXISTS "Admins can update assets" ON public.assets;
DROP POLICY IF EXISTS "Admins can view all assets" ON public.assets;
DROP POLICY IF EXISTS "Users can view own assets" ON public.assets;

CREATE POLICY "Admins can delete assets" ON public.assets FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert assets" ON public.assets FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update assets" ON public.assets FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all assets" ON public.assets FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own assets" ON public.assets FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = assets.client_id AND clients.user_id = auth.uid()));

-- insurance
DROP POLICY IF EXISTS "Admins can delete insurance" ON public.insurance;
DROP POLICY IF EXISTS "Admins can insert insurance" ON public.insurance;
DROP POLICY IF EXISTS "Admins can update insurance" ON public.insurance;
DROP POLICY IF EXISTS "Admins can view all insurance" ON public.insurance;
DROP POLICY IF EXISTS "Users can view own insurance" ON public.insurance;

CREATE POLICY "Admins can delete insurance" ON public.insurance FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert insurance" ON public.insurance FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update insurance" ON public.insurance FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all insurance" ON public.insurance FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own insurance" ON public.insurance FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = insurance.client_id AND clients.user_id = auth.uid()));

-- goals
DROP POLICY IF EXISTS "Admins can delete goals" ON public.goals;
DROP POLICY IF EXISTS "Admins can insert goals" ON public.goals;
DROP POLICY IF EXISTS "Admins can update goals" ON public.goals;
DROP POLICY IF EXISTS "Admins can view all goals" ON public.goals;
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;

CREATE POLICY "Admins can delete goals" ON public.goals FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert goals" ON public.goals FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update goals" ON public.goals FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all goals" ON public.goals FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own goals" ON public.goals FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = goals.client_id AND clients.user_id = auth.uid()));

-- diagnosis
DROP POLICY IF EXISTS "Admins can insert diagnosis" ON public.diagnosis;
DROP POLICY IF EXISTS "Admins can update diagnosis" ON public.diagnosis;
DROP POLICY IF EXISTS "Admins can view all diagnosis" ON public.diagnosis;
DROP POLICY IF EXISTS "Users can view own diagnosis" ON public.diagnosis;

CREATE POLICY "Admins can insert diagnosis" ON public.diagnosis FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update diagnosis" ON public.diagnosis FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all diagnosis" ON public.diagnosis FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own diagnosis" ON public.diagnosis FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = diagnosis.client_id AND clients.user_id = auth.uid()));

-- action_plans
DROP POLICY IF EXISTS "Admins can insert action plans" ON public.action_plans;
DROP POLICY IF EXISTS "Admins can update action plans" ON public.action_plans;
DROP POLICY IF EXISTS "Admins can view all action plans" ON public.action_plans;
DROP POLICY IF EXISTS "Users can view own action plans" ON public.action_plans;

CREATE POLICY "Admins can insert action plans" ON public.action_plans FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update action plans" ON public.action_plans FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all action plans" ON public.action_plans FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own action plans" ON public.action_plans FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = action_plans.client_id AND clients.user_id = auth.uid()));

-- monitoring_snapshots
DROP POLICY IF EXISTS "Admins can insert snapshots" ON public.monitoring_snapshots;
DROP POLICY IF EXISTS "Admins can view all snapshots" ON public.monitoring_snapshots;
DROP POLICY IF EXISTS "Users can view own snapshots" ON public.monitoring_snapshots;

CREATE POLICY "Admins can insert snapshots" ON public.monitoring_snapshots FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all snapshots" ON public.monitoring_snapshots FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own snapshots" ON public.monitoring_snapshots FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = monitoring_snapshots.client_id AND clients.user_id = auth.uid()));

-- action_items
DROP POLICY IF EXISTS "Admins can delete action items" ON public.action_items;
DROP POLICY IF EXISTS "Admins can insert action items" ON public.action_items;
DROP POLICY IF EXISTS "Admins can update action items" ON public.action_items;
DROP POLICY IF EXISTS "Admins can view all action items" ON public.action_items;
DROP POLICY IF EXISTS "Users can view own action items" ON public.action_items;

CREATE POLICY "Admins can delete action items" ON public.action_items FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert action items" ON public.action_items FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update action items" ON public.action_items FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all action items" ON public.action_items FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own action items" ON public.action_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM action_plans ap JOIN clients c ON c.id = ap.client_id WHERE ap.id = action_items.action_plan_id AND c.user_id = auth.uid()));

-- implementation_sessions
DROP POLICY IF EXISTS "Admins can delete sessions" ON public.implementation_sessions;
DROP POLICY IF EXISTS "Admins can insert sessions" ON public.implementation_sessions;
DROP POLICY IF EXISTS "Admins can update sessions" ON public.implementation_sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.implementation_sessions;
DROP POLICY IF EXISTS "Clients can view own sessions" ON public.implementation_sessions;

CREATE POLICY "Admins can delete sessions" ON public.implementation_sessions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert sessions" ON public.implementation_sessions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update sessions" ON public.implementation_sessions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all sessions" ON public.implementation_sessions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Clients can view own sessions" ON public.implementation_sessions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = implementation_sessions.client_id AND clients.user_id = auth.uid()));

-- investment_recommendations
DROP POLICY IF EXISTS "Admins can delete recommendations" ON public.investment_recommendations;
DROP POLICY IF EXISTS "Admins can insert recommendations" ON public.investment_recommendations;
DROP POLICY IF EXISTS "Admins can update recommendations" ON public.investment_recommendations;
DROP POLICY IF EXISTS "Admins can view all recommendations" ON public.investment_recommendations;
DROP POLICY IF EXISTS "Clients can view own recommendations" ON public.investment_recommendations;

CREATE POLICY "Admins can delete recommendations" ON public.investment_recommendations FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert recommendations" ON public.investment_recommendations FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update recommendations" ON public.investment_recommendations FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all recommendations" ON public.investment_recommendations FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Clients can view own recommendations" ON public.investment_recommendations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = investment_recommendations.client_id AND clients.user_id = auth.uid()));

-- ================================================
-- 3. SECURE STORAGE: parecer-images
-- Change public read to authenticated-only read
-- ================================================

DROP POLICY IF EXISTS "Public can read parecer images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload parecer images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete parecer images" ON storage.objects;

CREATE POLICY "Authenticated can read parecer images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'parecer-images');

CREATE POLICY "Admins can upload parecer images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'parecer-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete parecer images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'parecer-images' AND has_role(auth.uid(), 'admin'::app_role));
