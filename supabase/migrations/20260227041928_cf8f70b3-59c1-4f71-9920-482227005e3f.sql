
CREATE TABLE public.consultant_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.consultant_notes ENABLE ROW LEVEL SECURITY;

-- Admin full CRUD
CREATE POLICY "Admins can view all notes" ON public.consultant_notes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert notes" ON public.consultant_notes
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notes" ON public.consultant_notes
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete notes" ON public.consultant_notes
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Client can view own notes
CREATE POLICY "Clients can view own notes" ON public.consultant_notes
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = consultant_notes.client_id
        AND clients.user_id = auth.uid()
    )
  );

-- Auto-update updated_at
CREATE TRIGGER update_consultant_notes_updated_at
  BEFORE UPDATE ON public.consultant_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
