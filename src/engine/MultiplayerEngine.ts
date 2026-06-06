import type { GameState, Vec2 } from '../types/game.types';
import type { Room, RoomPlayer } from '../hooks/useMultiplayer';

// Simple seeded RNG (Mulberry32)
export function seededRandom(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
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
}

export function createMultiplayerState(room: Room, players: RoomPlayer[], currentUserId: string): MultiplayerState {
  const me = players.find(p => p.player_id === currentUserId)!;
  return {
    room,
    players,
    me,
    isHost: room.host_id === currentUserId,
    rng: seededRandom(room.seed),
    inputQueue: [],
    lastSeq: 0,
    lastBroadcast: 0,
  };
}

export function applyPlayerInput(state: GameState, input: PlayerInput): GameState {
  switch (input.type) {
    case 'draw_path':
      return {
        ...state,
        aircraft: state.aircraft.map(a => {
          if (a.id !== input.aircraftId) return a;
          return {
            ...a,
            path: input.path,
            pathProgress: 0, // Simplified for now
            state: a.state === 'holding' ? 'flying' : a.state,
          };
        })
      };
    case 'altitude_change':
      return {
        ...state,
        aircraft: state.aircraft.map(a => {
          if (a.id !== input.aircraftId) return a;
          return { ...a, targetAltitude: input.altitude };
        })
      };
    case 'runway_select':
      return {
        ...state,
        aircraft: state.aircraft.map(a => {
          if (a.id !== input.aircraftId) return a;
          return { ...a, targetRunwayId: input.runwayId };
        })
      };
    case 'holding_toggle':
      return {
        ...state,
        aircraft: state.aircraft.map(a => {
          if (a.id !== input.aircraftId) return a;
          if (a.state === 'holding') {
            return { ...a, state: 'flying', holdingCenter: null };
          }
          return { ...a, state: 'holding', holdingCenter: { ...a.position } };
        })
      };
  }
  return state;
}
