import type { AircraftType, LevelConfig } from '../types/game.types';
import { createAircraft } from './Aircraft';
import {
  randomBetween,
  randomEdgeSpawn,
  inwardHeading,
} from '../utils/pathMath';

function weightedRandom(weights: Record<AircraftType, number>, rng: () => number): AircraftType {
  const types = Object.keys(weights) as AircraftType[];
  const total = types.reduce((s, t) => s + weights[t], 0);
  let r = rng() * total;
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
  altitudeEnabled: boolean,
  forceNORDO = false,
  rng: () => number = Math.random,
  assignedPlayerId: string | null = null
) {
  const type = weightedRandom(config.typeWeights, rng);

  const validRunways = config.runways.filter((r) => {
    if (type === 'helicopter') return r.type === 'helipad';
    if (type === 'cessna') return r.type === 'short' || r.type === 'long';
    return r.type === 'long';
  });

  if (validRunways.length === 0) return null;

  const spawnPos = randomEdgeSpawn(canvasWidth, canvasHeight, 10, rng);
  const heading = inwardHeading(spawnPos, canvasWidth, canvasHeight) + randomBetween(-15, 15, rng);

  const roll = rng();
  const isEmergency = !forceNORDO && roll < 0.08;
  const isNORDO = forceNORDO || (!isEmergency && roll > 0.96);

  const altitude = altitudeEnabled ? (rng() > 0.5 ? 3 : 2) : 1;

  const ac = createAircraft(
    type,
    spawnPos,
    (heading + 360) % 360,
    config.airport.id,
    null,
    isEmergency,
    isNORDO,
    altitude as 1 | 2 | 3
  );

  return { ...ac, assignedPlayerId };
}
