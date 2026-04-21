-- Habilita realtime para investment_recommendations
ALTER TABLE public.investment_recommendations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.investment_recommendations;