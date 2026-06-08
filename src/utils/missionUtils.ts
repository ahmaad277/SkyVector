import type { DailyMission } from '../types/game.types';

export function pickNextMission(missions: DailyMission[]): string | null {
  const uncompleted = missions.filter(m => !m.completed);
  if (uncompleted.length === 0) return null;
  const randomMission = uncompleted[Math.floor(Math.random() * uncompleted.length)];
  return randomMission.id;
}
