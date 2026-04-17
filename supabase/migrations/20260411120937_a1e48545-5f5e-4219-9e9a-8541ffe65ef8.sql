
-- Add goal_id to action_items to link actions to client goals
ALTER TABLE public.action_items
ADD COLUMN goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL;

-- Index for faster lookups
CREATE INDEX idx_action_items_goal_id ON public.action_items(goal_id);
