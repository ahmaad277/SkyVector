import { useState, useEffect, useCallback } from 'react';
import { isSupabaseReady } from '../supabase/client';
import {
  getExistingAuthUserId,
  ensureAuthSession,
  getDailyMissions,
  submitScore,
  upsertPlayer,
  updateMissionProgress,
} from '../supabase/queries';
import type { PlayerProfile, DailyMission, PlayerRank } from '../types/game.types';
import { RANK_THRESHOLDS } from '../types/game.types';

function xpToRank(xp: number): PlayerRank {
  let current: PlayerRank = '2LT';
  for (const { rank, minXP } of RANK_THRESHOLDS) {
    if (xp >= minXP) current = rank;
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
      let currentId = profile.id;
      if (isSupabaseReady) {
        const existingId = await getExistingAuthUserId();
        if (existingId) {
          currentId = existingId;
          setProfile(prev => {
            const updated = { ...prev, id: existingId };
            saveLocalProfile(updated);
            return updated;
          });
        }
      }
      const fetchedMissions = await getDailyMissions(currentId);
      setMissions(fetchedMissions);
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
        let playerId = profile.id;
        if (isSupabaseReady) {
          const { id } = await ensureAuthSession();
          playerId = id;
        }
        await Promise.all([
          submitScore({ ...params, playerId, username: profile.username }),
          upsertPlayer({
            id: playerId,
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
