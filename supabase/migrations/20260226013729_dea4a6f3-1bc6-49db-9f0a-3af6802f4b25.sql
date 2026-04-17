
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'client');

-- Create enum for marital status
CREATE TYPE public.marital_status AS ENUM ('solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel');

-- Create enum for property regime
CREATE TYPE public.property_regime AS ENUM ('comunhao_parcial', 'comunhao_universal', 'separacao_total', 'participacao_final');

-- Create enum for income stability
CREATE TYPE public.income_stability AS ENUM ('alta', 'media', 'baixa');

-- Create enum for income frequency
CREATE TYPE public.income_frequency AS ENUM ('mensal', 'anual', 'eventual');

-- Create enum for risk classification
CREATE TYPE public.risk_classification AS ENUM ('A', 'B', 'C', 'D', 'E');

-- Create enum for action status
CREATE TYPE public.action_status AS ENUM ('pendente', 'em_andamento', 'concluido');

-- Create enum for action area
CREATE TYPE public.action_area AS ENUM ('renda', 'despesas', 'dividas', 'investimentos', 'protecao', 'impostos');

-- Create enum for client status
CREATE TYPE public.client_status AS ENUM ('onboarding_pendente', 'em_diagnostico', 'em_acompanhamento');

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- User Roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
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

-- RLS for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clients table (onboarding data)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  cpf TEXT,
  date_of_birth DATE,
  marital_status marital_status,
  property_regime property_regime,
  profession TEXT,
  company TEXT,
  years_in_profession INTEGER,
  dependents_count INTEGER DEFAULT 0,
  dependents_ages TEXT,
  city TEXT,
  state TEXT,
  status client_status NOT NULL DEFAULT 'onboarding_pendente',
  behavioral_profile JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own data" ON public.clients
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all clients" ON public.clients
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert clients" ON public.clients
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update clients" ON public.clients
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients can update own data" ON public.clients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Income table
CREATE TABLE public.income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  frequency income_frequency NOT NULL DEFAULT 'mensal',
  is_primary BOOLEAN DEFAULT false,
  stability income_stability DEFAULT 'media',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own income" ON public.income
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = income.client_id AND clients.user_id = auth.uid())
  );
CREATE POLICY "Admins can view all income" ON public.income
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert income" ON public.income
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update income" ON public.income
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete income" ON public.income
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_income_updated_at BEFORE UPDATE ON public.income
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_fixed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses" ON public.expenses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = expenses.client_id AND clients.user_id = auth.uid())
  );
CREATE POLICY "Admins can view all expenses" ON public.expenses
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert expenses" ON public.expenses
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update expenses" ON public.expenses
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete expenses" ON public.expenses
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Debts table
CREATE TABLE public.debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  creditor TEXT,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  monthly_payment DECIMAL(12,2) DEFAULT 0,
  interest_rate DECIMAL(5,2) DEFAULT 0,
  remaining_months INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own debts" ON public.debts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = debts.client_id AND clients.user_id = auth.uid())
  );
CREATE POLICY "Admins can view all debts" ON public.debts
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert debts" ON public.debts
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update debts" ON public.debts
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete debts" ON public.debts
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Assets table
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  estimated_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assets" ON public.assets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = assets.client_id AND clients.user_id = auth.uid())
  );
CREATE POLICY "Admins can view all assets" ON public.assets
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert assets" ON public.assets
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update assets" ON public.assets
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete assets" ON public.assets
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insurance table
CREATE TABLE public.insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  provider TEXT,
  monthly_premium DECIMAL(12,2) DEFAULT 0,
  coverage_amount DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.insurance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insurance" ON public.insurance
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = insurance.client_id AND clients.user_id = auth.uid())
  );
CREATE POLICY "Admins can view all insurance" ON public.insurance
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert insurance" ON public.insurance
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update insurance" ON public.insurance
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete insurance" ON public.insurance
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_insurance_updated_at BEFORE UPDATE ON public.insurance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Goals table
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  target_amount DECIMAL(12,2),
  deadline DATE,
  priority TEXT DEFAULT 'media',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals" ON public.goals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = goals.client_id AND clients.user_id = auth.uid())
  );
CREATE POLICY "Admins can view all goals" ON public.goals
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert goals" ON public.goals
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update goals" ON public.goals
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete goals" ON public.goals
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Diagnosis table
CREATE TABLE public.diagnosis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  total_income DECIMAL(12,2) DEFAULT 0,
  total_expenses DECIMAL(12,2) DEFAULT 0,
  total_debts DECIMAL(12,2) DEFAULT 0,
  total_assets DECIMAL(12,2) DEFAULT 0,
  savings_capacity DECIMAL(5,2) DEFAULT 0,
  debt_ratio DECIMAL(5,2) DEFAULT 0,
  risk_classification risk_classification DEFAULT 'C',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.diagnosis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diagnosis" ON public.diagnosis
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = diagnosis.client_id AND clients.user_id = auth.uid())
  );
CREATE POLICY "Admins can view all diagnosis" ON public.diagnosis
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert diagnosis" ON public.diagnosis
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update diagnosis" ON public.diagnosis
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_diagnosis_updated_at BEFORE UPDATE ON public.diagnosis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Action Plans table
CREATE TABLE public.action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Plano de Ação',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own action plans" ON public.action_plans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = action_plans.client_id AND clients.user_id = auth.uid())
  );
CREATE POLICY "Admins can view all action plans" ON public.action_plans
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert action plans" ON public.action_plans
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update action plans" ON public.action_plans
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_action_plans_updated_at BEFORE UPDATE ON public.action_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Action Items table
CREATE TABLE public.action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_plan_id UUID REFERENCES public.action_plans(id) ON DELETE CASCADE NOT NULL,
  area action_area NOT NULL,
  description TEXT NOT NULL,
  objective TEXT,
  responsible TEXT DEFAULT 'Novare',
  deadline DATE,
  financial_impact DECIMAL(12,2) DEFAULT 0,
  status action_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own action items" ON public.action_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.action_plans ap
      JOIN public.clients c ON c.id = ap.client_id
      WHERE ap.id = action_items.action_plan_id AND c.user_id = auth.uid()
    )
  );
CREATE POLICY "Admins can view all action items" ON public.action_items
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert action items" ON public.action_items
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update action items" ON public.action_items
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete action items" ON public.action_items
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_action_items_updated_at BEFORE UPDATE ON public.action_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Monitoring Snapshots table
CREATE TABLE public.monitoring_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_income DECIMAL(12,2) DEFAULT 0,
  total_expenses DECIMAL(12,2) DEFAULT 0,
  total_debts DECIMAL(12,2) DEFAULT 0,
  total_assets DECIMAL(12,2) DEFAULT 0,
  savings_rate DECIMAL(5,2) DEFAULT 0,
  plan_completion_pct DECIMAL(5,2) DEFAULT 0,
  emergency_reserve_months DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.monitoring_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots" ON public.monitoring_snapshots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clients WHERE clients.id = monitoring_snapshots.client_id AND clients.user_id = auth.uid())
  );
CREATE POLICY "Admins can view all snapshots" ON public.monitoring_snapshots
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert snapshots" ON public.monitoring_snapshots
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_monitoring_snapshots_updated_at BEFORE UPDATE ON public.monitoring_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
