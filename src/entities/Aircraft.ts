import type { Aircraft, AircraftType, Vec2 } from '../types/game.types';
import {
  vecDist,
  angleBetween,
  angleToHeading,
  shortestAngleDelta,
  pointAlongPath,
  pathLength,
  holdingPosition,
  applyWindDrift,
  headingToAngle,
} from '../utils/pathMath';

// ── Per-type base stats ──────────────────────────────────────
export const AIRCRAFT_STATS: Record<
  AircraftType,
  {
    speed: number;
    turnRate: number;        // deg/sec
    turnRadius: number;
    separationRadius: number;
    fuelBurnRate: number;
    fuelMax: number;
    size: number;            // canvas draw size px
    landingSpeed: number;
    approachTolerance: number;
    landingDistance: number; // px from runway centre
  }
> = {
  cessna: {
    speed: 22,
    turnRate: 70,
    turnRadius: 40,
    separationRadius: 38,
    fuelBurnRate: 1.2,
    fuelMax: 160,
    size: 20,
    landingSpeed: 16,
    approachTolerance: 32,
    landingDistance: 70,
  },
  jetliner: {
    speed: 36,
    turnRate: 36,
    turnRadius: 90,
    separationRadius: 56,
    fuelBurnRate: 2.0,
    fuelMax: 160,
    size: 26,
    landingSpeed: 26,
    approachTolerance: 22,
    landingDistance: 80,
  },
  fighter: {
    speed: 54,
    turnRate: 100,
    turnRadius: 60,
    separationRadius: 44,
    fuelBurnRate: 3.5,
    fuelMax: 140,
    size: 22,
    landingSpeed: 38,
    approachTolerance: 24,
    landingDistance: 75,
  },
  helicopter: {
    speed: 16,
    turnRate: 360,
    turnRadius: 0,
    separationRadius: 36,
    fuelBurnRate: 1.0,
    fuelMax: 160,
    size: 20,
    landingSpeed: 11,
    approachTolerance: 360,
    landingDistance: 54,
  },
};

// ── Factory function ─────────────────────────────────────────
let _idCounter = 0;
export function createAircraft(
  type: AircraftType,
  position: Vec2,
  heading: number,
  targetAirportId: string,
  targetRunwayId: string | null = null,
  isEmergency = false,
  isNORDO = false,
  altitude: 1 | 2 | 3 = 1
): Aircraft {
  const stats = AIRCRAFT_STATS[type];
  const callsigns: Record<AircraftType, string[]> = {
    cessna:     ['GA-01', 'GA-02', 'GA-03', 'GA-04', 'GA-07', 'N123X'],
    jetliner:   ['SVX-101', 'SVX-202', 'SVX-303', 'AL-400', 'EK-500'],
    fighter:    ['VIPER-1', 'EAGLE-2', 'RAPTOR-3', 'HORNET-4', 'F16-01'],
    helicopter: ['HELO-A', 'HELO-B', 'MEDEVAC', 'COAST-1', 'ARMY-H'],
  };
  const signs = callsigns[type];
  const callsign = isNORDO
    ? 'NORDO-ONE'
    : signs[_idCounter % signs.length];

  _idCounter++;
  return {
    id: `ac-${_idCounter}-${Date.now()}`,
    type,
    state: 'flying',
    position: { ...position },
    velocity: {
      x: Math.cos(headingToAngle(heading)) * stats.speed,
      y: Math.sin(headingToAngle(heading)) * stats.speed,
    },
    heading,
    speed: stats.speed,
    turnRadius: stats.turnRadius,
    separationRadius: stats.separationRadius,
    targetAirportId,
    targetRunwayId,
    path: [],
    pathProgress: 0,
    fuel: stats.fuelMax,
    maxFuel: stats.fuelMax,
    fuelBurnRate: isEmergency ? stats.fuelBurnRate * 1.5 : stats.fuelBurnRate,
    isEmergency,
    isNORDO,
    callsign,
    color: '',  // resolved dynamically in renderer
    holdingCenter: null,
    holdingAngle: heading,
    spawnTime: Date.now(),
    altitude,
    targetAltitude: altitude,
  };
}

// ── Update logic ─────────────────────────────────────────────
export function updateAircraft(
  ac: Aircraft,
  dt: number,
  windDir: number,
  windStrength: number
): Aircraft {
  if (ac.state === 'landed' || ac.state === 'crashed') return ac;

  // Burn fuel
  const newFuel = Math.max(0, ac.fuel - ac.fuelBurnRate * dt);
  // Altitude change
  let newAltitude = ac.altitude;
  if (ac.targetAltitude !== ac.altitude) {
    // Change by 1 level every 1 second
    // Since altitude is 1|2|3, we can just change it if enough time passed.
    // But we don't have a timer. Let's just change it instantly for simplicity,
    // or add a small chance to change it per frame?
    // Actually, let's just make it instant for now, or add a field.
    // Let's just set it instantly.
    newAltitude = ac.targetAltitude;
  }

  const newState = newFuel <= 0 && ac.state !== 'landing'
    ? 'crashed'
    : newFuel <= 20
    ? 'fuel_critical'
    : ac.state === 'fuel_critical' && newFuel > 20
    ? 'flying'
    : ac.state;

  if (ac.state === 'holding' && ac.holdingCenter) {
    return updateHolding(ac, dt, newFuel, newState, newAltitude);
  }

  if (ac.path.length >= 2 && ac.state !== 'landing') {
    return updateFollowPath(ac, dt, newFuel, newState, windDir, windStrength, newAltitude);
  }

  // Free-flight (no path assigned): continue on current heading
  return updateFreeFlight(ac, dt, newFuel, newState, windDir, windStrength, newAltitude);
}

function updateHolding(
  ac: Aircraft,
  dt: number,
  newFuel: number,
  newState: Aircraft['state'],
  newAltitude: 1 | 2 | 3
): Aircraft {
  const HOLDING_RADIUS = 35;
  // Natural speed: angular velocity = (linear speed / radius)
  const holdingSpeed = (ac.speed / HOLDING_RADIUS) * (180 / Math.PI); // deg/sec
  const newAngle = ac.holdingAngle + holdingSpeed * dt;
  const newPos = holdingPosition(ac.holdingCenter!, HOLDING_RADIUS, newAngle);
  // Tangential heading (clockwise rotation)
  const newHeading = (newAngle + 90) % 360;
  
  return {
    ...ac,
    position: newPos,
    heading: newHeading,
    holdingAngle: newAngle % 360,
    fuel: newFuel,
    altitude: newAltitude,
    state: newState === ac.state ? 'holding' : newState,
    velocity: {
      x: Math.cos(headingToAngle(newHeading)) * ac.speed,
      y: Math.sin(headingToAngle(newHeading)) * ac.speed,
    },
  };
}

function updateFollowPath(
  ac: Aircraft,
  dt: number,
  newFuel: number,
  newState: Aircraft['state'],
  windDir: number,
  windStrength: number,
  newAltitude: 1 | 2 | 3
): Aircraft {
  const stats = AIRCRAFT_STATS[ac.type];
  const totalLen = pathLength(ac.path);
  if (totalLen === 0) return { ...ac, fuel: newFuel };

  const travelledSoFar = ac.pathProgress * totalLen;
  const newTravelled = travelledSoFar + ac.speed * dt;

  if (newTravelled >= totalLen) {
    const rad = headingToAngle(ac.heading + 90);
    const HOLDING_RADIUS = 35;
    const center = { x: ac.position.x + Math.cos(rad) * HOLDING_RADIUS, y: ac.position.y + Math.sin(rad) * HOLDING_RADIUS };
    return {
      ...ac,
      position: ac.position,
      path: [],
      pathProgress: 0,
      state: 'holding',
      holdingCenter: center,
      holdingAngle: (ac.heading - 90 + 360) % 360,
      fuel: newFuel,
      altitude: newAltitude,
      velocity: {
        x: Math.cos(headingToAngle(ac.heading)) * ac.speed,
        y: Math.sin(headingToAngle(ac.heading)) * ac.speed,
      },
    };
  }

  const newProgress = newTravelled / totalLen;

  // ── Look-ahead steering ──────────────────────────────────
  // Compute look-ahead point further ahead for smoother turns on fast aircraft
  const lookAheadDist = Math.min(stats.speed * 0.9, totalLen - travelledSoFar);
  const lookAheadPos = pointAlongPath(ac.path, travelledSoFar + lookAheadDist);
  const desiredHeading = angleToHeading(angleBetween(ac.position, lookAheadPos));
  const headingDelta = shortestAngleDelta(ac.heading, desiredHeading);
  const maxTurn = stats.turnRate * dt;
  const headingStep = Math.sign(headingDelta) * Math.min(Math.abs(headingDelta), maxTurn);
  const newHeading = (ac.heading + headingStep + 360) % 360;

  // ── Velocity-based movement (no teleport) ───────────────
  // Move the aircraft by its own velocity vector, not by snapping to path
  let newVelX = Math.cos(headingToAngle(newHeading)) * ac.speed;
  let newVelY = Math.sin(headingToAngle(newHeading)) * ac.speed;

  if (windStrength > 0 && ac.state !== 'landing') {
    const drifted = applyWindDrift({ x: newVelX, y: newVelY }, windDir, windStrength * 0.12, dt);
    newVelX = drifted.x;
    newVelY = drifted.y;
  }

  const integratedPos = {
    x: ac.position.x + newVelX * dt,
    y: ac.position.y + newVelY * dt,
  };

  // ── Cross-track error correction ────────────────────────
  // Gently pull the aircraft back toward the reference path point to prevent
  // excessive drift on sharp turns. Strength varies by aircraft type.
  const crossTrackK: Record<string, number> = {
    cessna:     2.2,
    jetliner:   1.4,  // larger turn radius → less aggressive correction
    fighter:    3.0,  // highly agile
    helicopter: 4.0,  // can correct instantly
  };
  const k = crossTrackK[ac.type] ?? 2.0;
  const pathRef = pointAlongPath(ac.path, newTravelled);
  const errorX = pathRef.x - integratedPos.x;
  const errorY = pathRef.y - integratedPos.y;
  const errorLen = Math.sqrt(errorX * errorX + errorY * errorY);
  const desiredCorrection = Math.min(errorLen, errorLen * k * dt);
  const maxCorrection = ac.speed * 0.35 * dt;
  const correctionLen = Math.min(desiredCorrection, maxCorrection);
  const correctionScale = errorLen > 0 ? correctionLen / errorLen : 0;
  const correctedPos = {
    x: integratedPos.x + errorX * correctionScale,
    y: integratedPos.y + errorY * correctionScale,
  };

  return {
    ...ac,
    position: correctedPos,
    pathProgress: newProgress,
    heading: newHeading,
    fuel: newFuel,
    altitude: newAltitude,
    state: newState === ac.state ? ac.state : newState,
    velocity: { x: newVelX, y: newVelY },
  };
}

function updateFreeFlight(
  ac: Aircraft,
  dt: number,
  newFuel: number,
  newState: Aircraft['state'],
  windDir: number,
  windStrength: number,
  newAltitude: 1 | 2 | 3
): Aircraft {
  let vel = { ...ac.velocity };
  if (windStrength > 0) {
    vel = applyWindDrift(vel, windDir, windStrength * 0.08, dt);
  }
  return {
    ...ac,
    position: {
      x: ac.position.x + vel.x * dt,
      y: ac.position.y + vel.y * dt,
    },
    velocity: vel,
    fuel: newFuel,
    altitude: newAltitude,
    state: newState,
  };
}

// ── Collision distance ───────────────────────────────────────
export function collisionDistance(a: Aircraft, b: Aircraft): number {
  return vecDist(a.position, b.position);
}

export function isSeparationViolated(a: Aircraft, b: Aircraft): boolean {
  return collisionDistance(a, b) < (a.separationRadius + b.separationRadius);
}

export function isCollision(a: Aircraft, b: Aircraft): boolean {
  return collisionDistance(a, b) < ((a.separationRadius + b.separationRadius) * 0.5);
}
