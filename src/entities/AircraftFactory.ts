import type { AircraftType, LevelConfig } from '../types/game.types';
import { createAircraft } from './Aircraft';
import {
  randomBetween,
  randomEdgeSpawn,
  inwardHeading,
} from '../utils/pathMath';

function weightedRandom(weights: Record<AircraftType, number>): AircraftType {
  const types = Object.keys(weights) as AircraftType[];
  const total = types.reduce((s, t) => s + weights[t], 0);
  let r = Math.random() * total;
  for (const t of types) {
    r -= weights[t];
    if (r <= 0) return t;
  }
  return types[0];
}

export function spawnAircraft(
  config: LevelConfig,
  canvasWidth: number,
  canvasHeight: number,
  forceNORDO = false
) {
  const type = weightedRandom(config.typeWeights);

  // Pick a runway that accepts this aircraft type
  const validRunways = config.runways.filter((r) => {
    if (type === 'helicopter') return r.type === 'helipad';
    if (type === 'cessna')     return r.type === 'short' || r.type === 'long';
    return r.type === 'long';
  });

  if (validRunways.length === 0) return null;

  const spawnPos = randomEdgeSpawn(canvasWidth, canvasHeight);
  const heading = inwardHeading(spawnPos, canvasWidth, canvasHeight) + randomBetween(-15, 15);

  // ~8% emergency, ~4% VIP (not both)
  const roll = Math.random();
  const isEmergency = !forceNORDO && roll < 0.08;
  const isNORDO = forceNORDO || (!isEmergency && roll > 0.96);
  
  // Altitude: level >= 4 uses FL1/FL2/FL3. Spawn at FL3 usually.
  const altitude = config.id >= 4 ? (Math.random() > 0.5 ? 3 : 2) : 1;

  return createAircraft(
    type,
    spawnPos,
    (heading + 360) % 360,
    config.airport.id,
    null,
    isEmergency,
    isNORDO,
    altitude as 1 | 2 | 3
  );
}
