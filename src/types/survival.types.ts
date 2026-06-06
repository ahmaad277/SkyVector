import type { AircraftType } from './game.types';

export type PowerUpType = 
  | 'CHRONO_FREEZE' 
  | 'OMNIDIRECTIONAL' 
  | 'FUEL_RESERVES' 
  | 'EXTENDED_APPROACH' 
  | 'IRON_SHIELD' 
  | 'DOUBLE_SCORE';

export interface PowerUp {
  id: string;
  type: PowerUpType;
  name: string;
  description: string;
  durationMs: number; // 0 means instant or one-time use
}

export interface ActiveBuff {
  type: PowerUpType;
  expiresAt: number; // timestamp, or Infinity for one-time use like IRON_SHIELD
}

export interface SurvivalRound {
  round: number;
  landingTarget: number;
  timeLimitMs: number;
}

export interface SurvivalState {
  round: number;
  health: number; // 0-10
  roundStartTime: number;
  roundTimerMs: number; // total time given for this round
  roundLandings: number;
  roundLandingTarget: number;
  typeStreak: { type: AircraftType | null; count: number };
  activeBuffs: ActiveBuff[];
  totalScore: number;
  totalLandings: number;
  pendingPowerUpChoices: PowerUp[] | null;
}
