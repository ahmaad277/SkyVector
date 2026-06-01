// ============================================================
// CORE GAME TYPES — SkyVector: Air Command
// ============================================================

export type AircraftType = 'cessna' | 'jetliner' | 'fighter' | 'helicopter';
export type AircraftState = 'flying' | 'landing' | 'landed' | 'holding' | 'emergency' | 'crashed' | 'fuel_critical';
export type RunwayType = 'short' | 'long' | 'helipad';
export type GamePhase = 'menu' | 'playing' | 'paused' | 'gameover' | 'levelcomplete';
export type EventType = 'runway_closed' | 'wind_shear' | 'vip_flight' | 'bird_strike' | 'none';
export type PlayerRank =
  | 'Student Pilot'
  | 'Private Pilot'
  | 'CPL'
  | 'ATPL'
  | 'Senior Controller'
  | 'Tower Chief';

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
  targetRunwayId: string | null;
  path: Vec2[];            // drawn path waypoints
  pathProgress: number;    // 0-1 along path
  fuel: number;            // 0-100
  maxFuel: number;
  fuelBurnRate: number;    // units/sec
  isEmergency: boolean;
  isVIP: boolean;
  callsign: string;
  color: string;
  holdingCenter: Vec2 | null;
  holdingAngle: number;
  spawnTime: number;
}

export interface Runway {
  id: string;
  type: RunwayType;
  position: Vec2;
  angle: number;           // degrees — approach heading
  length: number;
  width: number;
  label: string;
  isOpen: boolean;
  closedUntil: number;     // timestamp ms, 0 = always open
}

export interface LevelConfig {
  id: number;
  name: string;
  subtitle: string;
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
    vipAircraftId?: string;
    birdStrikeZone?: { center: Vec2; radius: number };
  };
}

export interface ComboState {
  count: number;
  multiplier: number;
  lastLandingTime: number;
  timeoutMs: number;
}

export interface GameState {
  phase: GamePhase;
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
  gameOverReason?: 'collision' | 'fuel' | 'vip_delay';
}

export interface RankConfig {
  rank: PlayerRank;
  minXP: number;
  color: string;
  badge: string;
}

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
