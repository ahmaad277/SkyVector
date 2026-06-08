import type { GameState, Vec2 } from '../types/game.types';
import type { Room, RoomPlayer, MultiplayerMode } from '../hooks/useMultiplayer';
import { simplifyPath, smoothPath, findClosestForwardProgress } from '../utils/pathMath';
import { getLandingTargetForLevel } from '../utils/levelProgress';

export function seededRandom(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type PlayerInput =
  | { type: 'draw_path'; aircraftId: string; path: Vec2[]; playerId: string; seq: number }
  | { type: 'altitude_change'; aircraftId: string; altitude: 1 | 2 | 3; playerId: string; seq: number }
  | { type: 'runway_select'; aircraftId: string; runwayId: string | null; playerId: string; seq: number }
  | { type: 'holding_toggle'; aircraftId: string; playerId: string; seq: number };

export interface MultiplayerState {
  room: Room;
  players: RoomPlayer[];
  me: RoomPlayer;
  isHost: boolean;
  rng: () => number;
  inputQueue: PlayerInput[];
  lastSeq: number;
  lastBroadcast: number;
  spawnCounter: number;
  playerScores: Record<string, number>;
  playerLandings: Record<string, number>;
  playerLives: Record<string, number>;
  matchStartedAt: number;
  matchEnded: boolean;
  winnerId: string | null;
}

export const VERSUS_LANDING_GOAL = 15;
export const VERSUS_MATCH_MS = 5 * 60 * 1000;

function initPlayerStats(players: RoomPlayer[]): {
  scores: Record<string, number>;
  landings: Record<string, number>;
  lives: Record<string, number>;
} {
  const scores: Record<string, number> = {};
  const landings: Record<string, number> = {};
  const lives: Record<string, number> = {};
  for (const p of players) {
    scores[p.player_id] = 0;
    landings[p.player_id] = 0;
    lives[p.player_id] = 3;
  }
  return { scores, landings, lives };
}

export function createMultiplayerState(
  room: Room,
  players: RoomPlayer[],
  currentUserId: string
): MultiplayerState {
  const me = players.find((p) => p.player_id === currentUserId)!;
  const stats = initPlayerStats(players);
  return {
    room,
    players,
    me,
    isHost: room.host_id === currentUserId,
    rng: seededRandom(room.seed),
    inputQueue: [],
    lastSeq: 0,
    lastBroadcast: 0,
    spawnCounter: 0,
    playerScores: stats.scores,
    playerLandings: stats.landings,
    playerLives: stats.lives,
    matchStartedAt: Date.now(),
    matchEnded: false,
    winnerId: null,
  };
}

export function pickSpawnOwner(state: MultiplayerState): string | null {
  const mode = state.room.mode;
  if (mode === 'coop_shared') return null;
  if (state.players.length === 0) return state.me.player_id;
  const idx = state.spawnCounter % state.players.length;
  state.spawnCounter += 1;
  return state.players[idx].player_id;
}

export function canControlAircraft(
  state: MultiplayerState,
  playerId: string,
  aircraftId: string,
  gameState: GameState
): boolean {
  if (state.room.mode === 'coop_shared') return true;
  if (playerId === state.room.host_id) return true;
  const ac = gameState.aircraft.find((a) => a.id === aircraftId);
  if (!ac) return false;
  return ac.assignedPlayerId === playerId;
}

export function applyPlayerInput(state: GameState, input: PlayerInput): GameState {
  const mp = state.multiplayerState;
  if (mp && !canControlAircraft(mp, input.playerId, input.aircraftId, state)) {
    return state;
  }

  switch (input.type) {
    case 'draw_path':
      return {
        ...state,
        aircraft: state.aircraft.map((a) => {
          if (a.id !== input.aircraftId) return a;
          const drawnPath = smoothPath(simplifyPath(input.path, 8));
          const startProgress =
            drawnPath.length >= 2
              ? findClosestForwardProgress(drawnPath, a.position, a.heading)
              : 0;
          return {
            ...a,
            path: drawnPath,
            pathProgress: startProgress,
            state: a.state === 'holding' ? 'flying' : a.state,
          };
        }),
      };
    case 'altitude_change':
      return {
        ...state,
        aircraft: state.aircraft.map((a) => {
          if (a.id !== input.aircraftId) return a;
          return { ...a, targetAltitude: input.altitude };
        }),
      };
    case 'runway_select':
      return {
        ...state,
        aircraft: state.aircraft.map((a) => {
          if (a.id !== input.aircraftId) return a;
          return { ...a, targetRunwayId: input.runwayId };
        }),
      };
    case 'holding_toggle':
      return {
        ...state,
        aircraft: state.aircraft.map((a) => {
          if (a.id !== input.aircraftId) return a;
          if (a.state === 'holding') {
            return { ...a, state: 'flying', holdingCenter: null };
          }
          return { ...a, state: 'holding', holdingCenter: { ...a.position } };
        }),
      };
  }
  return state;
}

export function recordMultiplayerLanding(
  state: GameState,
  aircraftId: string,
  scoreGain: number
): GameState {
  const mp = state.multiplayerState;
  if (!mp) return state;

  const ac = state.aircraft.find((a) => a.id === aircraftId);
  const ownerId = ac?.assignedPlayerId ?? mp.room.host_id;

  if (mp.room.mode === 'versus') {
    const nextScores = { ...mp.playerScores, [ownerId]: (mp.playerScores[ownerId] ?? 0) + scoreGain };
    const nextLandings = {
      ...mp.playerLandings,
      [ownerId]: (mp.playerLandings[ownerId] ?? 0) + 1,
    };
    return {
      ...state,
      multiplayerState: {
        ...mp,
        playerScores: nextScores,
        playerLandings: nextLandings,
      },
    };
  }

  return {
    ...state,
    multiplayerState: {
      ...mp,
      playerLandings: {
        ...mp.playerLandings,
        [ownerId]: (mp.playerLandings[ownerId] ?? 0) + 1,
      },
    },
  };
}

export interface MatchEndResult {
  reason: 'coop_complete' | 'versus_landings' | 'versus_time' | 'coop_gameover';
  winnerId: string | null;
  playerScores: Record<string, number>;
}

export function checkMultiplayerMatchEnd(state: GameState, now: number): MatchEndResult | null {
  const mp = state.multiplayerState;
  if (!mp || mp.matchEnded) return null;

  const mode = mp.room.mode;

  if (mode === 'versus') {
    for (const p of mp.players) {
      if ((mp.playerLandings[p.player_id] ?? 0) >= VERSUS_LANDING_GOAL) {
        return {
          reason: 'versus_landings',
          winnerId: p.player_id,
          playerScores: mp.playerScores,
        };
      }
    }
    if (now - mp.matchStartedAt >= VERSUS_MATCH_MS) {
      let winnerId = mp.players[0]?.player_id ?? null;
      let best = -1;
      for (const p of mp.players) {
        const s = mp.playerScores[p.player_id] ?? 0;
        if (s > best) {
          best = s;
          winnerId = p.player_id;
        }
      }
      return { reason: 'versus_time', winnerId, playerScores: mp.playerScores };
    }
    return null;
  }

  const target = getLandingTargetForLevel(mp.room.level);
  if (state.totalLandings >= target) {
    return {
      reason: 'coop_complete',
      winnerId: null,
      playerScores: mp.playerScores,
    };
  }

  if (state.lives <= 0) {
    return {
      reason: 'coop_gameover',
      winnerId: null,
      playerScores: mp.playerScores,
    };
  }

  return null;
}

export function getModeDescription(mode: MultiplayerMode): string {
  switch (mode) {
    case 'coop_shared':
      return 'Team shares one airspace. Anyone can vector any aircraft. Shared score and lives.';
    case 'coop_squad':
      return 'Co-op with assigned aircraft per player. Control only your planes; team shares the landing goal.';
    case 'versus':
      return 'Competitive: first to 15 landings wins, or highest score after 5 minutes.';
  }
}

export function requiresMinTwoPlayers(mode: MultiplayerMode): boolean {
  return mode === 'coop_squad' || mode === 'versus';
}

export const PLAYER_COLOR_HEX: Record<string, string> = {
  cyan: '#00F0FF',
  magenta: '#FF00FF',
  amber: '#FFD700',
  lime: '#39FF14',
  coral: '#FF6B6B',
  violet: '#9B59B6',
};

export function resolvePlayerColor(color: string): string {
  return PLAYER_COLOR_HEX[color] ?? color;
}

export function getPlayerColor(state: MultiplayerState, playerId: string): string {
  const raw = state.players.find((p) => p.player_id === playerId)?.color ?? 'cyan';
  return resolvePlayerColor(raw);
}
