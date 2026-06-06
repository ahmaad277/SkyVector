import { useState, useEffect, useCallback } from 'react';
import { isSupabaseReady } from '../supabase/client';
import {
  signInAnonymously,
  getCurrentUser,
  upsertPlayer,
  submitScore,
  getDailyMissions,
  updateMissionProgress,
} from '../supabase/queries';
import type { DailyMission, PlayerProfile, PlayerRank } from '../types/game.types';

const RANK_THRESHOLDS: Record<PlayerRank, number> = {
  '2LT':       0,
  '1LT':       500,
  'CAPT':      1500,
  'MAJ':       3000,
  'LT. COL':   6000,
  'COL':       10000,
  'BRIG GEN':  15000,
  'MAJ. GEN':  22000,
  'LT. GEN':   32000,
  'GEN':       50000,
};

function xpToRank(xp: number): PlayerRank {
  const ranks = Object.entries(RANK_THRESHOLDS) as [PlayerRank, number][];
  let current: PlayerRank = '2LT';
  for (const [rank, min] of ranks) {
    if (xp >= min) current = rank;
  }
  return current;
}

const LOCAL_PROFILE_KEY = 'skyvector_profile';

function loadLocalProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {
    id: `guest-${Date.now()}`,
    username: `CTRL-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
    rank: '2LT',
    totalXP: 0,
    bestScore: 0,
    gamesPlayed: 0,
    totalLandings: 0,
    dailyMissions: [],
  };
}

function saveLocalProfile(p: PlayerProfile) {
  localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(p));
}

export function useSupabase() {
  const [profile, setProfile] = useState<PlayerProfile>(loadLocalProfile);
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [syncing, setSyncing] = useState(false);

  // ── Auth init ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      if (isSupabaseReady) {
        let user = await getCurrentUser();
        if (!user) {
          const id = await signInAnonymously();
          if (id) {
            user = { id } as any;
          }
        }
        
        if (user) {
          setProfile(prev => {
            const updated = { ...prev, id: user.id };
            saveLocalProfile(updated);
            return updated;
          });
        }
      }
      const missions = await getDailyMissions(profile.id);
      setMissions(missions);
    })();
  }, []);

  // ── Add XP + rank up ────────────────────────────────────────
  const addXP = useCallback((xp: number) => {
    setProfile((prev) => {
      const newXP = prev.totalXP + xp;
      const newRank = xpToRank(newXP);
      const updated = { ...prev, totalXP: newXP, rank: newRank };
      saveLocalProfile(updated);
      return updated;
    });
  }, []);

  // ── Save game result ─────────────────────────────────────────
  const saveGameResult = useCallback(
    async (params: {
      score: number;
      levelReached: number;
      comboMax: number;
      durationSeconds: number;
      totalLandings: number;
    }) => {
      setSyncing(true);
      const isNewBest = params.score > profile.bestScore;

      const xpGained = Math.floor(params.score / 10) + params.totalLandings * 20;
      const newXP = profile.totalXP + xpGained;
      const newRank = xpToRank(newXP);

      const updated: PlayerProfile = {
        ...profile,
        totalXP: newXP,
        rank: newRank,
        bestScore: isNewBest ? params.score : profile.bestScore,
        gamesPlayed: profile.gamesPlayed + 1,
        totalLandings: profile.totalLandings + params.totalLandings,
      };
      saveLocalProfile(updated);
      setProfile(updated);

      // Update high score in localStorage
      if (isNewBest) {
        localStorage.setItem('skyvector_highscore', String(params.score));
      }

      // Sync to Supabase
      try {
        await Promise.all([
          submitScore({ ...params, playerId: profile.id, username: profile.username }),
          upsertPlayer({
            id: profile.id,
            username: profile.username,
            totalXP: newXP,
            bestScore: updated.bestScore,
          }),
        ]);
      } catch (err) {
        console.warn('[Supabase] Sync failed (offline?):', err);
      } finally {
        setSyncing(false);
      }

      return { xpGained, isNewBest, newRank };
    },
    [profile]
  );

  // ── Mission progress update ──────────────────────────────────
  const progressMission = useCallback(
    async (type: DailyMission['type'], increment = 1) => {
      setMissions((prev) =>
        prev.map((m) => {
          if (m.type !== type || m.completed) return m;
          const newCurrent = Math.min(m.current + increment, m.target);
          const completed = newCurrent >= m.target;
          if (completed) addXP(m.xpReward);
          updateMissionProgress(profile.id, m.id, newCurrent, completed).catch(console.error);
          return { ...m, current: newCurrent, completed };
        })
      );
    },
    [profile.id, addXP]
  );

  return {
    profile,
    missions,
    syncing,
    addXP,
    saveGameResult,
    progressMission,
  };
}
