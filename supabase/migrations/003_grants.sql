-- Grant PostgREST / Supabase API access to tables created via SQL Editor.
-- Without these, clients get: "permission denied for table rooms"

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Multiplayer
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_players TO anon, authenticated;

-- Core game tables (if 001 was run without grants)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO anon, authenticated;
GRANT SELECT, INSERT ON public.scores TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_missions TO anon, authenticated;

-- Leaderboard view
GRANT SELECT ON public.leaderboard_view TO anon, authenticated;
