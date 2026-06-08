import type { DailyMission } from '../types/game.types';

export interface MissionPickContext {
  isSurvival?: boolean;
  level?: number;
}

export function pickNextMission(
  missions: DailyMission[],
  context?: MissionPickContext
): string | null {
  const uncompleted = missions.filter((m) => !m.completed);
  if (uncompleted.length === 0) return null;

  let pool = uncompleted;
  if (context?.isSurvival) {
    const preferred = uncompleted.filter(
      (m) => m.type === 'land_count' || m.type === 'combo_streak'
    );
    if (preferred.length > 0) pool = preferred;
  } else if (context?.level && context.level >= 5) {
    const preferred = uncompleted.filter(
      (m) => m.type === 'emergency' || m.type === 'vip_land'
    );
    if (preferred.length > 0) pool = preferred;
  }

  return pool[Math.floor(Math.random() * pool.length)].id;
}
