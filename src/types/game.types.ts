// ============================================================
// CORE GAME TYPES — SkyVector: Air Command
// ============================================================

export type AircraftType = 'cessna' | 'jetliner' | 'fighter' | 'helicopter';
export type AircraftState = 'flying' | 'landing' | 'landed' | 'holding' | 'emergency' | 'crashed' | 'fuel_critical' | 'altitude_change';
export type RunwayType = 'short' | 'long' | 'helipad';
export type GamePhase = 'menu' | 'playing' | 'paused' | 'gameover' | 'levelcomplete';
export type EventType = 'runway_closed' | 'wind_shear' | 'nordo_flight' | 'bird_strike' | 'round_start' | 'none';
export type PlayerRank =
  | '2LT'
  | '1LT'
  | 'CAPT'
  | 'MAJ'
  | 'LT. COL'
  | 'COL'
  | 'BRIG GEN'
  | 'MAJ. GEN'
  | 'LT. GEN'
  | 'GEN';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Aircraft {
  id: string;
  type: AircraftType;
  state: AircraftState;
  position: Vec2;
  velocity: Vec2;
  heading: number;         // degrees 0-360
  speed: number;           // px/sec
  turnRadius: number;      // px
  separationRadius: number;
  targetAirportId: string | null;
  targetRunwayId: string | null;
  path: Vec2[];            // drawn path waypoints
  pathProgress: number;    // 0-1 along path
  fuel: number;            // 0-100
  maxFuel: number;
  fuelBurnRate: number;    // units/sec
  isEmergency: boolean;
  isNORDO: boolean;
  callsign: string;
  color: string;
  holdingCenter: Vec2 | null;
  holdingAngle: number;
  spawnTime: number;
  landedTime?: number;
  altitude: 1 | 2 | 3;
  targetAltitude: 1 | 2 | 3;
  assignedPlayerId?: string | null;
}

export interface Runway {
  id: string;
  airportId: string;
  type: RunwayType;
  position: Vec2;
  angle: number;           // degrees — approach heading
  length: number;
  width: number;
  label: string;
  isOpen: boolean;
  closedUntil: number;     // timestamp ms, 0 = always open
}

export interface AirportInfo {
  id: string;
  icao: string;
  name: string;
}

export interface LevelConfig {
  id: number;
  name: string;
  subtitle: string;
  airport: AirportInfo;
  runways: Omit<Runway, 'isOpen' | 'closedUntil'>[];
  spawnRateMs: number;        // time between spawns
  maxAircraft: number;
  allowedTypes: AircraftType[];
  typeWeights: Record<AircraftType, number>;
  hasRadarSweep: boolean;     // Level 4: IFR
  hasWindShear: boolean;
  windDirection: number;      // degrees
  windStrength: number;       // px/sec drift
  visibilityRadius: number;   // px, Infinity = full
  backgroundStars: boolean;
}

export interface GameEvent {
  type: EventType;
  startTime: number;
  duration: number;
  payload?: {
    runwayId?: string;
    windDelta?: number;
    nordoAircraftId?: string;
    birdStrikeZone?: { center: Vec2; radius: number };
    powerUpName?: string;
    round?: number;
  };
}

export interface ComboState {
  count: number;
  multiplier: number;
  lastLandingTime: number;
  timeoutMs: number;
}

export interface ScorePopup {
  id: string;
  position: Vec2;
  score: number;
  createdAt: number;
}

import type { SurvivalState } from './survival.types';
import type { MultiplayerState } from '../engine/MultiplayerEngine';

export interface GameState {
  phase: GamePhase | 'survival_complete';
  level: number;
  score: number;
  highScore: number;
  lives: number;
  aircraft: Aircraft[];
  runways: Runway[];
  combo: ComboState;
  activeEvent: GameEvent | null;
  nextEventTime: number;
  radarAngle: number;       // 0-360 for sweep
  windDirection: number;
  windStrength: number;
  sessionStartTime: number;
  totalLandings: number;
  collisions: number;
  selectedAircraftId: string | null;
  drawingPath: Vec2[];
  isDrawing: boolean;
  scorePopups: ScorePopup[];
  screenShakeUntil?: number;
  invulnerableUntil?: number;
  gameOverReason?: 'collision' | 'fuel' | 'vip_delay' | 'survival_health';
  levelStats: {
    perfectLandings: number;
    fastestLanding: number;
    totalTimeBonuses: number;
  };
  survivalState?: SurvivalState;
  multiplayerState?: MultiplayerState;
  altitudeEnabled: boolean;
}

export interface RankConfig {
  rank: PlayerRank;
  minXP: number;
  color: string;
  badge: string;
}

// Unified rank thresholds — single source of truth for the entire app
export const RANK_THRESHOLDS: RankConfig[] = [
  { rank: '2LT',      minXP: 0,       color: '#888',    badge: '⭐' },
  { rank: '1LT',      minXP: 500,     color: '#A0A0A0', badge: '⭐⭐' },
  { rank: 'CAPT',     minXP: 1500,    color: '#B0B0B0', badge: '⭐⭐⭐' },
  { rank: 'MAJ',      minXP: 3000,    color: '#C0C0C0', badge: '👑' },
  { rank: 'LT. COL',  minXP: 6000,    color: '#D0D0D0', badge: '👑⭐' },
  { rank: 'COL',      minXP: 10000,   color: '#E0E0E0', badge: '👑⭐⭐' },
  { rank: 'BRIG GEN', minXP: 15000,   color: '#F0E68C', badge: '👑⭐⭐⭐' },
  { rank: 'MAJ. GEN', minXP: 22000,   color: '#FFD700', badge: '⚔️⭐' },
  { rank: 'LT. GEN',  minXP: 32000,   color: '#FFA500', badge: '⚔️👑' },
  { rank: 'GEN',      minXP: 50000,   color: '#FF8C00', badge: '⚔️👑⭐' },
];

export interface DailyMission {
  id: string;
  description: string;
  type: 'land_count' | 'combo_streak' | 'emergency' | 'no_fuel_loss' | 'vip_land';
  target: number;
  current: number;
  completed: boolean;
  xpReward: number;
}

export interface PlayerProfile {
  id: string;
  username: string;
  rank: PlayerRank;
  totalXP: number;
  bestScore: number;
  gamesPlayed: number;
  totalLandings: number;
  dailyMissions: DailyMission[];
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  level_reached: number;
  combo_max: number;
  created_at: string;
}
