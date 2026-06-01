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
    speed: 28,
    turnRate: 75,
    turnRadius: 40,
    separationRadius: 34,
    fuelBurnRate: 2,
    fuelMax: 100,
    size: 14,
    landingSpeed: 20,
    approachTolerance: 32,
    landingDistance: 70,
  },
  jetliner: {
    speed: 46,
    turnRate: 38,
    turnRadius: 90,
    separationRadius: 52,
    fuelBurnRate: 3.5,
    fuelMax: 100,
    size: 19,
    landingSpeed: 34,
    approachTolerance: 22,
    landingDistance: 80,
  },
  fighter: {
    speed: 70,
    turnRate: 100,
    turnRadius: 60,
    separationRadius: 40,
    fuelBurnRate: 6,
    fuelMax: 80,
    size: 16,
    landingSpeed: 50,
    approachTolerance: 24,
    landingDistance: 75,
  },
  helicopter: {
    speed: 20,
    turnRate: 360,
    turnRadius: 0,
    separationRadius: 32,
    fuelBurnRate: 1.8,
    fuelMax: 100,
    size: 14,
    landingSpeed: 14,
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
  targetRunwayId: string,
  isEmergency = false,
  isVIP = false
): Aircraft {
  const stats = AIRCRAFT_STATS[type];
  const callsigns: Record<AircraftType, string[]> = {
    cessna:     ['GA-01', 'GA-02', 'GA-03', 'GA-04', 'GA-07', 'N123X'],
    jetliner:   ['SVX-101', 'SVX-202', 'SVX-303', 'AL-400', 'EK-500'],
    fighter:    ['VIPER-1', 'EAGLE-2', 'RAPTOR-3', 'HORNET-4', 'F16-01'],
    helicopter: ['HELO-A', 'HELO-B', 'MEDEVAC', 'COAST-1', 'ARMY-H'],
  };
  const signs = callsigns[type];
  const callsign = isVIP
    ? 'VIP-ONE'
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
    targetRunwayId,
    path: [],
    pathProgress: 0,
    fuel: stats.fuelMax,
    maxFuel: stats.fuelMax,
    fuelBurnRate: isEmergency ? stats.fuelBurnRate * 1.5 : stats.fuelBurnRate,
    isEmergency,
    isVIP,
    callsign,
    color: '',  // resolved dynamically in renderer
    holdingCenter: null,
    holdingAngle: heading,
    spawnTime: Date.now(),
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
  const newState = newFuel <= 0 && ac.state !== 'landing'
    ? 'crashed'
    : newFuel <= 20
    ? 'fuel_critical'
    : ac.state === 'fuel_critical' && newFuel > 20
    ? 'flying'
    : ac.state;

  if (ac.state === 'holding' && ac.holdingCenter) {
    return updateHolding(ac, dt, newFuel, newState);
  }

  if (ac.path.length >= 2 && ac.state !== 'landing') {
    return updateFollowPath(ac, dt, newFuel, newState, windDir, windStrength);
  }

  // Free-flight (no path assigned): continue on current heading
  return updateFreeFlight(ac, dt, newFuel, newState, windDir, windStrength);
}

function updateHolding(
  ac: Aircraft,
  dt: number,
  newFuel: number,
  newState: Aircraft['state']
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
  windStrength: number
): Aircraft {
  const stats = AIRCRAFT_STATS[ac.type];
  const totalLen = pathLength(ac.path);
  if (totalLen === 0) return { ...ac, fuel: newFuel };

  const travelledSoFar = ac.pathProgress * totalLen;
  const newTravelled = travelledSoFar + ac.speed * dt;

  if (newTravelled >= totalLen) {
    // Reached end of path, automatically enter holding pattern
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
      velocity: {
        x: Math.cos(headingToAngle(ac.heading)) * ac.speed,
        y: Math.sin(headingToAngle(ac.heading)) * ac.speed,
      },
    };
  }

  const newProgress = newTravelled / totalLen;
  const newPos = pointAlongPath(ac.path, newTravelled);

  // Compute desired heading toward next point
  const lookAheadDist = Math.min(40, totalLen - travelledSoFar);
  const lookAheadPos = pointAlongPath(ac.path, travelledSoFar + lookAheadDist);
  const desiredHeading = angleToHeading(angleBetween(newPos, lookAheadPos));
  const headingDelta = shortestAngleDelta(ac.heading, desiredHeading);
  const maxTurn = stats.turnRate * dt;
  const headingStep = Math.sign(headingDelta) * Math.min(Math.abs(headingDelta), maxTurn);
  const newHeading = (ac.heading + headingStep + 360) % 360;

  // Apply light wind drift when not yet on approach
  let driftedPos = newPos;
  if (windStrength > 0 && ac.state !== 'landing') {
    const vel = { x: Math.cos(headingToAngle(newHeading)) * ac.speed, y: Math.sin(headingToAngle(newHeading)) * ac.speed };
    const drifted = applyWindDrift(vel, windDir, windStrength * 0.15, dt);
    driftedPos = { x: newPos.x + (drifted.x - vel.x) * dt, y: newPos.y + (drifted.y - vel.y) * dt };
  }

  return {
    ...ac,
    position: driftedPos,
    pathProgress: newProgress,
    heading: newHeading,
    fuel: newFuel,
    state: newState === ac.state ? ac.state : newState,
    velocity: {
      x: Math.cos(headingToAngle(newHeading)) * ac.speed,
      y: Math.sin(headingToAngle(newHeading)) * ac.speed,
    },
  };
}

function updateFreeFlight(
  ac: Aircraft,
  dt: number,
  newFuel: number,
  newState: Aircraft['state'],
  windDir: number,
  windStrength: number
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
