import type { Aircraft, Runway, GameState } from '../types/game.types';
import { isSeparationViolated, isCollision } from '../entities/Aircraft';
import { getDynamicRunwayAngle, getActiveApproachHeading, getActiveThresholdPosition } from '../entities/Runway';
import {
  isAlignedWithRunway,
  vecDist,
} from '../utils/pathMath';
import { AIRCRAFT_STATS } from '../entities/Aircraft';

export interface CollisionResult {
  collision: boolean;
  colliderIds: [string, string] | null;
  warnings: Array<{ id1: string; id2: string }>;
  outOfBoundsIds: string[];
}

// ── Check all aircraft pairs ─────────────────────────────────
export function checkCollisions(
  aircraft: Aircraft[],
  canvasWidth: number,
  canvasHeight: number
): CollisionResult {
  const warnings: Array<{ id1: string; id2: string }> = [];
  const outOfBoundsIds: string[] = [];

  for (let i = 0; i < aircraft.length; i++) {
    const a = aircraft[i];
    if (a.state === 'landed' || a.state === 'crashed') continue;

    // Out of bounds check (left the radar screen)
    const margin = 60;
    if (
      a.position.x < -margin ||
      a.position.x > canvasWidth + margin ||
      a.position.y < -margin ||
      a.position.y > canvasHeight + margin
    ) {
      outOfBoundsIds.push(a.id);
    }

    for (let j = i + 1; j < aircraft.length; j++) {
      const b = aircraft[j];
      if (b.state === 'landed' || b.state === 'crashed') continue;
      if (a.altitude !== b.altitude) continue; // No collision if at different altitudes

      if (isCollision(a, b)) {
        return {
          collision: true,
          colliderIds: [a.id, b.id],
          warnings,
          outOfBoundsIds,
        };
      }

      if (isSeparationViolated(a, b)) {
        warnings.push({ id1: a.id, id2: b.id });
      }
    }
  }

  return { collision: false, colliderIds: null, warnings, outOfBoundsIds };
}

// ── Landing logic ────────────────────────────────────────────
export interface LandingResult {
  aircraftId: string;
  runwayId: string;
  scoreGain: number;
  isEmergency: boolean;
  isNORDO: boolean;
  timeBonus: number;
  perfectBonus: number;
}

export function checkLandings(
  aircraft: Aircraft[],
  runways: Runway[],
  now: number,
  windDir?: number,
  windStrength?: number,
  isOmnidirectional: boolean = false,
  isExtendedApproach: boolean = false
): LandingResult[] {
  const results: LandingResult[] = [];

  for (const ac of aircraft) {
    if (ac.state === 'landed' || ac.state === 'crashed' || !ac.targetAirportId) continue;
    if (ac.altitude !== 1) continue; // Must be at FL1 to land

    const airportRunways = runways.filter(
      (r) =>
        r.airportId === ac.targetAirportId &&
        r.isOpen &&
        (r.closedUntil === 0 || now >= r.closedUntil) &&
        acceptsAircraft(r, ac) &&
        (!ac.targetRunwayId || r.id === ac.targetRunwayId)
    );
    if (airportRunways.length === 0) continue;

    const stats = AIRCRAFT_STATS[ac.type];

    // Helicopter → land at helipad center only (no direction check)
    if (ac.type === 'helicopter') {
      for (const runway of airportRunways) {
        const dist = vecDist(ac.position, runway.position);
        if (dist < stats.landingDistance) {
          results.push(buildLandingResult(ac, runway.id, now, 0));
          break;
        }
      }
      continue;
    }

    for (const runway of airportRunways) {
      // Fixed-wing: must be aligned AND near the active threshold (not anywhere on the strip)
      const dynamicAngle = getDynamicRunwayAngle(runway.angle, windDir, windStrength);
      const activeHeading = getActiveApproachHeading(dynamicAngle, windDir, windStrength);
      const aligned = isOmnidirectional || isAlignedWithRunway(ac.heading, activeHeading, stats.approachTolerance);

      if (!aligned) continue;

      // Distance measured from the ACTIVE THRESHOLD, not runway center
      const threshold = getActiveThresholdPosition(runway, windDir, windStrength);
      const distToThreshold = vecDist(ac.position, threshold);
      const allowedDistance = isExtendedApproach ? stats.landingDistance * 2 : stats.landingDistance;

      if (distToThreshold < allowedDistance) {
        // Calculate angle deviation for perfect landing bonus
        let angleDiff = Math.abs(ac.heading - activeHeading);
        if (angleDiff > 180) angleDiff = 360 - angleDiff;
        
        results.push(buildLandingResult(ac, runway.id, now, angleDiff));
        break;
      }
    }
  }

  return results;
}

function acceptsAircraft(runway: Runway, ac: Aircraft): boolean {
  if (ac.type === 'helicopter') return runway.type === 'helipad';
  if (ac.type === 'cessna') return runway.type === 'short' || runway.type === 'long';
  return runway.type === 'long';
}

function buildLandingResult(ac: Aircraft, runwayId: string, now: number, angleDiff: number): LandingResult {
  let score = 100;
  if (ac.isEmergency) score += 50;
  if (ac.isNORDO) score *= 10;
  
  let timeBonus = 0;
  const timeInAir = now - ac.spawnTime;
  if (timeInAir < 30000) {
    timeBonus = Math.floor((30000 - timeInAir) / 1000) * 2; // up to 60 points
    score += timeBonus;
  }
  
  let perfectBonus = 0;
  if (ac.type !== 'helicopter' && angleDiff < 5) {
    perfectBonus = 25;
    score += perfectBonus;
  }
  
  return {
    aircraftId: ac.id,
    runwayId,
    scoreGain: score,
    isEmergency: ac.isEmergency,
    isNORDO: ac.isNORDO,
    timeBonus,
    perfectBonus,
  };
}

// ── Combo system ─────────────────────────────────────────────
export function updateCombo(state: GameState, now: number, didLand: boolean): GameState['combo'] {
  const { combo } = state;
  const COMBO_TIMEOUT = 5000; // ms

  if (!didLand) {
    // Check timeout
    if (now - combo.lastLandingTime > COMBO_TIMEOUT && combo.count > 0) {
      return { count: 0, multiplier: 1, lastLandingTime: combo.lastLandingTime, timeoutMs: COMBO_TIMEOUT };
    }
    return combo;
  }

  const withinWindow = now - combo.lastLandingTime <= COMBO_TIMEOUT;
  const newCount = withinWindow ? combo.count + 1 : 1;
  const newMultiplier = newCount >= 5 ? 5 : newCount >= 3 ? 3 : newCount >= 2 ? 2 : 1;

  return {
    count: newCount,
    multiplier: newMultiplier,
    lastLandingTime: now,
    timeoutMs: COMBO_TIMEOUT,
  };
}

// ── Bird strike check ────────────────────────────────────────
export function checkBirdStrike(
  aircraft: Aircraft[],
  zone: { center: { x: number; y: number }; radius: number }
): string[] {
  return aircraft
    .filter(
      (ac) =>
        ac.state !== 'landed' &&
        ac.state !== 'crashed' &&
        vecDist(ac.position, zone.center) < zone.radius + ac.separationRadius
    )
    .map((ac) => ac.id);
}
