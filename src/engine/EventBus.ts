import type { GameEvent, EventType, GameState } from '../types/game.types';
import { randomBetween, randomIntBetween } from '../utils/pathMath';

const EVENT_INTERVAL_MS = 30_000;    // 30 seconds between events
const EVENT_DURATION_MS = 20_000;    // most events last 20 seconds

export function shouldTriggerEvent(state: GameState, now: number): boolean {
  if (state.level < 2) return false;           // no events on tutorial
  if (state.activeEvent !== null) return false;
  return now >= state.nextEventTime;
}

export function generateEvent(state: GameState, now: number): GameEvent {
  const eligible: EventType[] = ['wind_shear', 'nordo_flight', 'bird_strike'];
  // Runway close only if we have multiple runways
  if (state.runways.length >= 2) eligible.push('runway_closed');

  const type = eligible[randomIntBetween(0, eligible.length - 1)];

  const event: GameEvent = {
    type,
    startTime: now,
    duration: EVENT_DURATION_MS,
    payload: {},
  };

  switch (type) {
    case 'runway_closed': {
      const openRunways = state.runways.filter((r) => r.isOpen);
      if (openRunways.length > 1) {
        const idx = randomIntBetween(0, openRunways.length - 1);
        event.payload = { runwayId: openRunways[idx].id };
        event.duration = 25_000;
      } else {
        event.type = 'wind_shear';
      }
      break;
    }
    case 'wind_shear': {
      event.payload = { windDelta: randomBetween(-45, 45) };
      event.duration = 15_000;
      break;
    }
    case 'bird_strike': {
      event.payload = {
        birdStrikeZone: {
          center: {
            x: randomBetween(150, 650),
            y: randomBetween(150, 450),
          },
          radius: randomBetween(60, 100),
        },
      };
      event.duration = 20_000;
      break;
    }
    case 'nordo_flight': {
      event.duration = 30_000;
      break;
    }
  }

  return event;
}

export function nextEventTime(now: number): number {
  return now + EVENT_INTERVAL_MS + randomBetween(-15_000, 15_000);
}

export function applyEventToState(state: GameState, event: GameEvent): GameState {
  let newState = { ...state, activeEvent: event };

  if (event.type === 'runway_closed' && event.payload?.runwayId) {
    newState.runways = state.runways.map((r) =>
      r.id === event.payload!.runwayId
        ? { ...r, isOpen: false, closedUntil: event.startTime + event.duration }
        : r
    );
  }

  if (event.type === 'wind_shear' && event.payload?.windDelta !== undefined) {
    newState.windDirection = (state.windDirection + event.payload.windDelta + 360) % 360;
    newState.windStrength = Math.min(state.windStrength + 15, 40);
  }

  return newState;
}

export function expireEvent(state: GameState, now: number): GameState {
  if (!state.activeEvent) return state;
  if (now < state.activeEvent.startTime + state.activeEvent.duration) return state;

  let newState = { ...state, activeEvent: null, nextEventTime: nextEventTime(now) };

  // Reopen closed runway
  if (state.activeEvent.type === 'runway_closed' && state.activeEvent.payload?.runwayId) {
    newState.runways = state.runways.map((r) =>
      r.id === state.activeEvent!.payload!.runwayId
        ? { ...r, isOpen: true, closedUntil: 0 }
        : r
    );
  }

  // Restore wind
  if (state.activeEvent.type === 'wind_shear') {
    newState.windStrength = Math.max(0, state.windStrength - 15);
  }

  return newState;
}
