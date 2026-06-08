import { supabase, isSupabaseReady } from './client';
import { ensureAuthSession } from './auth';
import type { LeaderboardEntry, DailyMission } from '../types/game.types';

// ── Score submission ──────────────────────────────────────────
export async function submitScore(params: {
  playerId: string;
  username: string;
  score: number;
  levelReached: number;
  comboMax: number;
  durationSeconds: number;
}): Promise<void> {
  if (!isSupabaseReady) return;
  const { error } = await supabase.from('scores').insert({
    player_id: params.playerId,
    score: params.score,
    level_reached: params.levelReached,
    combo_max: params.comboMax,
    duration_seconds: params.durationSeconds,
  });
  if (error) console.error('[Supabase] submitScore error:', error.message);
}

// ── Leaderboard ───────────────────────────────────────────────
export async function getLeaderboard(
  scope: 'global' | 'weekly' = 'global',
  limit = 50
): Promise<LeaderboardEntry[]> {
  if (!isSupabaseReady) return [];

  let query = supabase
    .from('leaderboard_view')
    .select('rank, username, score, level_reached, combo_max, created_at')
    .order('score', { ascending: false })
    .limit(limit);

  if (scope === 'weekly') {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', weekAgo);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[Supabase] getLeaderboard error:', error.message);
    return [];
  }
  return (data ?? []).map((row, i) => ({ ...row, rank: i + 1 }));
}

// ── Player profile ────────────────────────────────────────────
export async function upsertPlayer(params: {
  id: string;
  username: string;
  totalXP: number;
  bestScore: number;
}): Promise<void> {
  if (!isSupabaseReady) return;
  const { error } = await supabase.from('players').upsert(
    {
      id: params.id,
      username: params.username,
      total_xp: params.totalXP,
      best_score: params.bestScore,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) console.error('[Supabase] upsertPlayer error:', error.message);
}

// ── Daily Missions ────────────────────────────────────────────
export async function getDailyMissions(playerId: string): Promise<DailyMission[]> {
  if (!isSupabaseReady) return generateLocalMissions();

  const isAuthUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(playerId);
  if (!isAuthUuid) return generateLocalMissions();

  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('daily_missions')
    .select('*')
    .eq('player_id', playerId)
    .eq('date', today);

  if (error || !data || data.length === 0) {
    // Seed missions if none exist today
    const missions = generateLocalMissions();
    await supabase.from('daily_missions').insert(
      missions.map((m) => ({
        id: m.id,
        player_id: playerId,
        mission_type: m.type,
        target: m.target,
        current: 0,
        is_completed: false,
        date: today,
      }))
    );
    return missions;
  }

  return data.map((row) => ({
    id: row.id,
    description: missionDescription(row.mission_type, row.target),
    type: row.mission_type,
    target: row.target,
    current: row.current,
    completed: row.is_completed,
    xpReward: missionXP(row.mission_type),
  }));
}

export async function updateMissionProgress(
  playerId: string,
  missionId: string,
  current: number,
  completed: boolean
): Promise<void> {
  if (!isSupabaseReady) return;
  await supabase
    .from('daily_missions')
    .update({ current, is_completed: completed })
    .eq('id', missionId)
    .eq('player_id', playerId);
}

// ── Auth helpers ──────────────────────────────────────────────
export { ensureAuthSession, getExistingAuthUserId } from './auth';

export async function signInAnonymously(): Promise<string | null> {
  if (!isSupabaseReady) return `guest-${Date.now()}`;
  try {
    const { id } = await ensureAuthSession();
    return id;
  } catch {
    return null;
  }
}

export async function signInWithGoogle(): Promise<void> {
  if (!isSupabaseReady) return;
  await supabase.auth.signInWithOAuth({ provider: 'google' });
}

export async function signInWithApple(): Promise<void> {
  if (!isSupabaseReady) return;
  await supabase.auth.signInWithOAuth({ provider: 'apple' });
}

export async function getCurrentUser() {
  if (!isSupabaseReady) return null;
  try {
    const { id } = await ensureAuthSession();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? { id } as import('@supabase/supabase-js').User;
  } catch {
    return null;
  }
}

// ── Real-time leaderboard subscription ───────────────────────
export function subscribeToLeaderboard(
  callback: (entries: LeaderboardEntry[]) => void
): () => void {
  if (!isSupabaseReady) return () => {};

  const channel = supabase
    .channel('leaderboard-live')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'scores' },
      async () => {
        const entries = await getLeaderboard('global');
        callback(entries);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ── Local helpers ─────────────────────────────────────────────
function generateLocalMissions(): DailyMission[] {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      id: `${today}-land10`,
      description: 'Land 10 aircraft successfully',
      type: 'land_count',
      target: 10,
      current: 0,
      completed: false,
      xpReward: 200,
    },
    {
      id: `${today}-combo3`,
      description: 'Achieve a x3 combo streak',
      type: 'combo_streak',
      target: 3,
      current: 0,
      completed: false,
      xpReward: 350,
    },
    {
      id: `${today}-emergency2`,
      description: 'Handle 2 emergency aircraft',
      type: 'emergency',
      target: 2,
      current: 0,
      completed: false,
      xpReward: 300,
    },
    {
      id: `${today}-vip1`,
      description: 'Land a VIP aircraft safely',
      type: 'vip_land',
      target: 1,
      current: 0,
      completed: false,
      xpReward: 500,
    },
    {
      id: `${today}-land25`,
      description: 'Land 25 aircraft total',
      type: 'land_count',
      target: 25,
      current: 0,
      completed: false,
      xpReward: 400,
    },
    {
      id: `${today}-combo5`,
      description: 'Achieve a x5 combo streak',
      type: 'combo_streak',
      target: 5,
      current: 0,
      completed: false,
      xpReward: 600,
    },
    {
      id: `${today}-emergency5`,
      description: 'Handle 5 emergency aircraft',
      type: 'emergency',
      target: 5,
      current: 0,
      completed: false,
      xpReward: 700,
    },
    {
      id: `${today}-vip3`,
      description: 'Land 3 VIP aircraft',
      type: 'vip_land',
      target: 3,
      current: 0,
      completed: false,
      xpReward: 800,
    },
    {
      id: `${today}-land50`,
      description: 'Land 50 aircraft total',
      type: 'land_count',
      target: 50,
      current: 0,
      completed: false,
      xpReward: 1000,
    },
    {
      id: `${today}-combo7`,
      description: 'Achieve a x7 combo streak',
      type: 'combo_streak',
      target: 7,
      current: 0,
      completed: false,
      xpReward: 1200,
    },
  ];
}

function missionDescription(type: string, target: number): string {
  switch (type) {
    case 'land_count':    return `Land ${target} aircraft`;
    case 'combo_streak':  return `Achieve x${target} combo`;
    case 'emergency':     return `Handle ${target} emergency${target > 1 ? 's' : ''}`;
    case 'no_fuel_loss':  return 'Land without any fuel-outs';
    case 'vip_land':      return 'Land a VIP aircraft';
    default:              return 'Complete mission';
  }
}

function missionXP(type: string): number {
  switch (type) {
    case 'land_count':    return 200;
    case 'combo_streak':  return 350;
    case 'emergency':     return 300;
    case 'no_fuel_loss':  return 400;
    case 'vip_land':      return 500;
    default:              return 150;
  }
}
