ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS month_ref date;
ALTER TABLE public.income ADD COLUMN IF NOT EXISTS month_ref date;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS month_ref date;
ALTER TABLE public.action_items ADD COLUMN IF NOT EXISTS month_ref date;
CREATE INDEX IF NOT EXISTS idx_goals_client_month ON public.goals(client_id, month_ref);
CREATE INDEX IF NOT EXISTS idx_income_client_month ON public.income(client_id, month_ref);
CREATE INDEX IF NOT EXISTS idx_expenses_client_month ON public.expenses(client_id, month_ref);
CREATE INDEX IF NOT EXISTS idx_action_items_plan_month ON public.action_items(action_plan_id, month_ref);