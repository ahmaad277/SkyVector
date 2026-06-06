-- Rooms table for multiplayer sessions
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) NOT NULL UNIQUE,
  host_id UUID NOT NULL REFERENCES auth.users(id),
  mode VARCHAR(32) NOT NULL DEFAULT 'coop_shared',
  level INTEGER NOT NULL DEFAULT 1,
  seed INTEGER NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'lobby', -- lobby, playing, finished
  max_players INTEGER NOT NULL DEFAULT 6,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Room players table
CREATE TABLE IF NOT EXISTS public.room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id),
  username VARCHAR(64) NOT NULL,
  slot INTEGER NOT NULL,
  color VARCHAR(32) NOT NULL,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(room_id, player_id)
);

-- RLS Policies
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;

-- Anyone can read rooms (to join by code)
CREATE POLICY "Anyone can read rooms" ON public.rooms FOR SELECT USING (true);

-- Authenticated users can create rooms
CREATE POLICY "Users can create rooms" ON public.rooms FOR INSERT WITH CHECK (auth.uid() = host_id);

-- Host can update their room
CREATE POLICY "Host can update room" ON public.rooms FOR UPDATE USING (auth.uid() = host_id);

-- Anyone can read room players
CREATE POLICY "Anyone can read room players" ON public.room_players FOR SELECT USING (true);

-- Authenticated users can join rooms
CREATE POLICY "Users can join rooms" ON public.room_players FOR INSERT WITH CHECK (auth.uid() = player_id);

-- Users can update their own player status (ready, color, etc)
CREATE POLICY "Users can update their own player state" ON public.room_players FOR UPDATE USING (auth.uid() = player_id);

-- Users can leave rooms
CREATE POLICY "Users can leave rooms" ON public.room_players FOR DELETE USING (auth.uid() = player_id);
