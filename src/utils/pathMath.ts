import type { Vec2 } from '../types/game.types';

// ── Basic Vector Math ────────────────────────────────────────
export function vecAdd(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vecSub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vecScale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function vecLength(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vecNormalize(v: Vec2): Vec2 {
  const len = vecLength(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function vecDist(a: Vec2, b: Vec2): number {
  return vecLength(vecSub(b, a));
}

export function vecDot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function vecLerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// ── Angle Utilities ──────────────────────────────────────────
export function angleBetween(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function angleToHeading(rad: number): number {
  let deg = (rad * 180) / Math.PI;
  return (deg + 360) % 360;
}

export function headingToAngle(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + 540) % 360) - 180;
  return a + diff * t;
}

export function shortestAngleDelta(from: number, to: number): number {
  let delta = ((to - from + 540) % 360) - 180;
  return delta;
}

// ── Path Utilities ───────────────────────────────────────────

/** Total length of a polyline path */
export function pathLength(path: Vec2[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += vecDist(path[i - 1], path[i]);
  }
  return total;
}

/** Get a point along a polyline at distance `d` from start */
export function pointAlongPath(path: Vec2[], d: number): Vec2 {
  if (path.length === 0) return { x: 0, y: 0 };
  if (path.length === 1) return path[0];
  let remaining = d;
  for (let i = 1; i < path.length; i++) {
    const segLen = vecDist(path[i - 1], path[i]);
    if (remaining <= segLen) {
      const t = segLen === 0 ? 0 : remaining / segLen;
      return vecLerp(path[i - 1], path[i], t);
    }
    remaining -= segLen;
  }
  return path[path.length - 1];
}

/** Normalize a drawn path — simplify points that are too close */
export function simplifyPath(path: Vec2[], minDist = 8): Vec2[] {
  if (path.length < 2) return path;
  const result: Vec2[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    if (vecDist(result[result.length - 1], path[i]) >= minDist) {
      result.push(path[i]);
    }
  }
  return result;
}

/** Smooth a path with a simple moving average */
export function smoothPath(path: Vec2[], passes = 2): Vec2[] {
  let pts = [...path];
  for (let p = 0; p < passes; p++) {
    const next: Vec2[] = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      next.push({
        x: (pts[i - 1].x + pts[i].x + pts[i + 1].x) / 3,
        y: (pts[i - 1].y + pts[i].y + pts[i + 1].y) / 3,
      });
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }
  return pts;
}

/**
 * Finds the normalized progress (0–1) of the closest point on `path`
 * that lies within a forward arc (±90°) of `acHeading`.
 * If no forward point exists, returns 0 (start of path).
 * Used to prevent aircraft from snapping backwards when a new path is drawn
 * while the aircraft has already moved ahead of the drag-start point.
 */
export function findClosestForwardProgress(
  path: Vec2[],
  acPos: Vec2,
  acHeading: number
): number {
  if (path.length < 2) return 0;
  const total = pathLength(path);
  if (total === 0) return 0;

  const headingRad = headingToAngle(acHeading);
  const fwdX = Math.cos(headingRad);
  const fwdY = Math.sin(headingRad);

  let bestProgress = -1;
  let bestDist = Infinity;
  let accumulated = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const A = path[i];
    const B = path[i + 1];
    const segLen = vecDist(A, B);
    if (segLen === 0) { accumulated += segLen; continue; }

    // Project acPos onto segment A→B, clamped to [0,1]
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const t = Math.max(0, Math.min(1,
      ((acPos.x - A.x) * dx + (acPos.y - A.y) * dy) / (segLen * segLen)
    ));
    const proj: Vec2 = { x: A.x + t * dx, y: A.y + t * dy };
    const dist = vecDist(acPos, proj);

    // Check if this projected point is in the forward hemisphere
    const toProj: Vec2 = { x: proj.x - acPos.x, y: proj.y - acPos.y };
    const projLen = vecLength(toProj);
    const dot = projLen > 0
      ? (toProj.x * fwdX + toProj.y * fwdY) / projLen
      : 0;
    const isForward = dot >= -0.1; // allow ±96° arc for smooth interception

    if (isForward && dist < bestDist) {
      bestDist = dist;
      bestProgress = (accumulated + t * segLen) / total;
    }
    accumulated += segLen;
  }

  return bestProgress >= 0 ? bestProgress : 0;
}

// ── Holding Pattern ──────────────────────────────────────────

/** Get position on a circular holding pattern */
export function holdingPosition(center: Vec2, radius: number, angleDeg: number): Vec2 {
  const rad = headingToAngle(angleDeg);
  return {
    x: center.x + Math.cos(rad) * radius,
    y: center.y + Math.sin(rad) * radius,
  };
}

// ── Runway Alignment ─────────────────────────────────────────

/** Check if aircraft is aligned with runway approach within tolerance */
export function isAlignedWithRunway(
  aircraftHeading: number,
  runwayAngle: number,
  toleranceDeg = 25
): boolean {
  const delta = Math.abs(shortestAngleDelta(aircraftHeading, runwayAngle));
  return delta <= toleranceDeg;
}

/** Get the runway approach entry point (some distance before threshold) */
export function runwayApproachPoint(
  runwayPos: Vec2,
  runwayAngle: number,
  approachDistance = 120
): Vec2 {
  const rad = headingToAngle(runwayAngle + 180);
  return {
    x: runwayPos.x + Math.cos(rad) * approachDistance,
    y: runwayPos.y + Math.sin(rad) * approachDistance,
  };
}

// ── Wind Drift ───────────────────────────────────────────────

/** Apply wind drift to a velocity vector */
export function applyWindDrift(
  velocity: Vec2,
  windDir: number,
  windStrength: number,
  dt: number
): Vec2 {
  const rad = headingToAngle(windDir);
  return {
    x: velocity.x + Math.cos(rad) * windStrength * dt,
    y: velocity.y + Math.sin(rad) * windStrength * dt,
  };
}

// ── Canvas Helpers ───────────────────────────────────────────

export function canvasPoint(e: MouseEvent | Touch, canvas: HTMLCanvasElement): Vec2 {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomIntBetween(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

/** Random spawn position on the edge of the canvas */
export function randomEdgeSpawn(width: number, height: number, margin = 10): Vec2 {
  const side = randomIntBetween(0, 3);
  const topMargin = 85; // Extra margin at the top to avoid spawning under the HUD
  switch (side) {
    case 0: return { x: randomBetween(margin, width - margin), y: topMargin };          // top
    case 1: return { x: width - margin, y: randomBetween(topMargin, height - margin) }; // right
    case 2: return { x: randomBetween(margin, width - margin), y: height - margin }; // bottom
    default: return { x: margin, y: randomBetween(topMargin, height - margin) };        // left
  }
}

/** Heading from edge spawn pointing inward */
export function inwardHeading(pos: Vec2, width: number, height: number): number {
  const cx = width / 2;
  const cy = height / 2;
  return angleToHeading(angleBetween(pos, { x: cx, y: cy }));
}
