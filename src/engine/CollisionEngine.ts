import type { Aircraft, Runway, GameState } from '../types/game.types';
import { isSeparationViolated, isCollision } from '../entities/Aircraft';
import { isOnRunway, getDynamicRunwayAngle, getActiveApproachHeading, getActiveThresholdPosition } from '../entities/Runway';
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
  isVIP: boolean;
}

export function checkLandings(
  aircraft: Aircraft[],
  runways: Runway[],
  now: number,
  windDir?: number,
  windStrength?: number
): LandingResult[] {
  const results: LandingResult[] = [];

  for (const ac of aircraft) {
    if (ac.state === 'landed' || ac.state === 'crashed' || !ac.targetRunwayId) continue;

    const runway = runways.find((r) => r.id === ac.targetRunwayId);
    if (!runway) continue;
    if (!runway.isOpen || (runway.closedUntil > 0 && now < runway.closedUntil)) continue;

    const stats = AIRCRAFT_STATS[ac.type];

    // Helicopter → land at helipad center only (no direction check)
    if (ac.type === 'helicopter' && runway.type === 'helipad') {
      const dist = vecDist(ac.position, runway.position);
      if (dist < stats.landingDistance) {
        results.push(buildLandingResult(ac));
      }
      continue;
    }

    // Fixed-wing: must be aligned AND near the active threshold (not anywhere on the strip)
    const dynamicAngle = getDynamicRunwayAngle(runway.angle, windDir, windStrength);
    const activeHeading = getActiveApproachHeading(dynamicAngle, windDir, windStrength);
    const aligned = isAlignedWithRunway(ac.heading, activeHeading, stats.approachTolerance);

    if (!aligned) continue;

    // Distance measured from the ACTIVE THRESHOLD, not runway center
    const threshold = getActiveThresholdPosition(runway, windDir, windStrength);
    const distToThreshold = vecDist(ac.position, threshold);

    if (distToThreshold < stats.landingDistance) {
      results.push(buildLandingResult(ac));
    }
  }

  return results;
}

function buildLandingResult(ac: Aircraft): LandingResult {
  let score = 100;
  if (ac.isEmergency) score += 50;
  if (ac.isVIP) score *= 10;
  return {
    aircraftId: ac.id,
    runwayId: ac.targetRunwayId!,
    scoreGain: score,
    isEmergency: ac.isEmergency,
    isVIP: ac.isVIP,
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
