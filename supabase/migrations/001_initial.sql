-- SkyVector: Air Command — Initial Database Schema
-- Run this in Supabase SQL Editor

-- ── Players ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT NOT NULL,
  total_xp      INTEGER NOT NULL DEFAULT 0,
  best_score    INTEGER NOT NULL DEFAULT 0,
  games_played  INTEGER NOT NULL DEFAULT 0,
  total_landings INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Scores ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id        UUID REFERENCES players(id) ON DELETE CASCADE,
  score            INTEGER NOT NULL,
  level_reached    INTEGER NOT NULL DEFAULT 1,
  combo_max        INTEGER NOT NULL DEFAULT 1,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_player ON scores(player_id);
CREATE INDEX IF NOT EXISTS idx_scores_created ON scores(created_at DESC);

-- ── Daily Missions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_missions (
  id           TEXT NOT NULL,
  player_id    UUID REFERENCES players(id) ON DELETE CASCADE,
  mission_type TEXT NOT NULL,
  target       INTEGER NOT NULL,
  current      INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_missions_player_date ON daily_missions(player_id, date);

-- ── Leaderboard View ─────────────────────────────────────────
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT
  ROW_NUMBER() OVER (ORDER BY s.score DESC) AS rank,
  p.username,
  s.score,
  s.level_reached,
  s.combo_max,
  s.created_at
FROM scores s
JOIN players p ON p.id = s.player_id
ORDER BY s.score DESC;

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_missions ENABLE ROW LEVEL SECURITY;

-- Anyone can read the leaderboard
CREATE POLICY "Leaderboard is public"
  ON scores FOR SELECT USING (true);

CREATE POLICY "Players are public"
  ON players FOR SELECT USING (true);

-- Authenticated users can insert/update their own records
CREATE POLICY "Users manage own player record"
  ON players FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users insert own scores"
  ON scores FOR INSERT
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users manage own missions"
  ON daily_missions FOR ALL
  USING (auth.uid() = player_id)
  WITH CHECK (auth.uid() = player_id);
