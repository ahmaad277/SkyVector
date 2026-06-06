import type { AircraftType, LevelConfig } from '../types/game.types';
import type { SurvivalState, PowerUp, PowerUpType } from '../types/survival.types';
import { LEVELS } from '../levels';

export const MAX_HEALTH = 10;

export const POWER_UPS: Record<PowerUpType, Omit<PowerUp, 'id'>> = {
  CHRONO_FREEZE: {
    type: 'CHRONO_FREEZE',
    name: 'CHRONO FREEZE',
    description: 'Aircraft speed reduced by 50%',
    durationMs: 15000,
  },
  OMNIDIRECTIONAL: {
    type: 'OMNIDIRECTIONAL',
    name: 'OMNIDIRECTIONAL',
    description: 'Land from any direction',
    durationMs: 20000,
  },
  FUEL_RESERVES: {
    type: 'FUEL_RESERVES',
    name: 'FUEL RESERVES',
    description: '+40 Fuel to all aircraft',
    durationMs: 0,
  },
  EXTENDED_APPROACH: {
    type: 'EXTENDED_APPROACH',
    name: 'EXTENDED APPROACH',
    description: 'Landing distance tolerance doubled',
    durationMs: 20000,
  },
  IRON_SHIELD: {
    type: 'IRON_SHIELD',
    name: 'IRON SHIELD',
    description: 'Next collision or penalty deals 0 damage',
    durationMs: 0,
  },
  DOUBLE_SCORE: {
    type: 'DOUBLE_SCORE',
    name: 'DOUBLE SCORE',
    description: 'Score gains are doubled',
    durationMs: 15000,
  },
};

export function createInitialSurvivalState(): SurvivalState {
  return {
    round: 1,
    health: MAX_HEALTH,
    roundStartTime: Date.now(),
    roundTimerMs: getRoundTimeLimit(1),
    roundLandings: 0,
    roundLandingTarget: getRoundLandingTarget(1),
    typeStreak: { type: null, count: 0 },
    activeBuffs: [],
    totalScore: 0,
    totalLandings: 0,
    pendingPowerUpChoices: null,
  };
}

export function getRoundLandingTarget(round: number): number {
  return 4 + (round * 2);
}

export function getRoundTimeLimit(round: number): number {
  return Math.max(45000, 90000 - (round * 3000));
}

// Generates a LevelConfig that scales difficulty with the survival round
export function getSurvivalLevelConfig(round: number): LevelConfig {
  // Use OEJN Midnight (Level 8) as a base for airport/runways, but we can mix it up
  // Let's just use a base config and modify it.
  const baseConfig = LEVELS[7]; // OEJN Midnight has 3 long + 1 helipad

  return {
    ...baseConfig,
    id: 999,
    name: `SURVIVAL ROUND ${round}`,
    subtitle: 'ENDLESS MODE',
    spawnRateMs: Math.max(1200, 3000 - (round * 150)),
    maxAircraft: Math.min(15, 4 + Math.floor(round / 2)),
    hasWindShear: round >= 4,
    hasRadarSweep: round >= 6,
    windDirection: round >= 8 ? 180 : baseConfig.windDirection,
    windStrength: round >= 8 ? 20 : (round >= 4 ? 10 : 0),
    visibilityRadius: round >= 10 ? 100 : Infinity,
  };
}

export function generatePowerUpChoices(): PowerUp[] {
  const types = Object.keys(POWER_UPS) as PowerUpType[];
  const shuffled = [...types].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map(type => ({
    ...POWER_UPS[type],
    id: `pu-${Date.now()}-${Math.random()}`,
  }));
}

export function applyPowerUp(state: SurvivalState, powerUp: PowerUp, now: number): SurvivalState {
  if (powerUp.durationMs === 0) {
    // Instant or one-time
    return {
      ...state,
      activeBuffs: [...state.activeBuffs, { type: powerUp.type, expiresAt: Infinity }],
    };
  } else {
    // Timed buff
    return {
      ...state,
      activeBuffs: [...state.activeBuffs, { type: powerUp.type, expiresAt: now + powerUp.durationMs }],
    };
  }
}

export function processSurvivalLanding(state: SurvivalState, type: AircraftType, isCombo5: boolean): SurvivalState {
  let newState = { ...state };
  
  // Update streak
  if (newState.typeStreak.type === type) {
    newState.typeStreak.count += 1;
  } else {
    newState.typeStreak = { type, count: 1 };
  }

  // Check for streak power-up
  if (newState.typeStreak.count >= 3) {
    let earnedType: PowerUpType | null = null;
    if (type === 'fighter') earnedType = 'CHRONO_FREEZE';
    else if (type === 'helicopter') earnedType = 'OMNIDIRECTIONAL';
    else if (type === 'jetliner') earnedType = 'FUEL_RESERVES';
    else if (type === 'cessna') earnedType = 'EXTENDED_APPROACH';

    if (earnedType) {
      newState = applyPowerUp(newState, { ...POWER_UPS[earnedType], id: `pu-streak-${Date.now()}` }, Date.now());
    }
    newState.typeStreak = { type: null, count: 0 };
  }

  if (isCombo5) {
    newState = applyPowerUp(newState, { ...POWER_UPS['DOUBLE_SCORE'], id: `pu-combo-${Date.now()}` }, Date.now());
  }

  newState.roundLandings += 1;
  newState.totalLandings += 1;

  if (newState.roundLandings >= newState.roundLandingTarget && !newState.pendingPowerUpChoices) {
    newState.pendingPowerUpChoices = generatePowerUpChoices();
  }

  return newState;
}

export function expireBuffs(state: SurvivalState, now: number): SurvivalState {
  const activeBuffs = state.activeBuffs.filter(b => b.expiresAt > now);
  if (activeBuffs.length !== state.activeBuffs.length) {
    return { ...state, activeBuffs };
  }
  return state;
}

export function hasBuff(state: SurvivalState, type: PowerUpType): boolean {
  return state.activeBuffs.some(b => b.type === type);
}

export function consumeIronShield(state: SurvivalState): SurvivalState {
  return {
    ...state,
    activeBuffs: state.activeBuffs.filter(b => b.type !== 'IRON_SHIELD'),
  };
}
