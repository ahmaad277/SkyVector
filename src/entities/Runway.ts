import type { Runway, RunwayType, Vec2 } from '../types/game.types';
import { headingToAngle, shortestAngleDelta } from '../utils/pathMath';

export function getDynamicRunwayAngle(baseAngle: number, windDir?: number, windStrength?: number): number {
  if (!windStrength || windStrength === 0 || windDir === undefined) return baseAngle;
  const delta = shortestAngleDelta(baseAngle, windDir);
  // Max tilt of 15 degrees. 1 degree per 2 units of wind.
  const tilt = Math.sign(delta) * Math.min(Math.abs(delta), windStrength / 2, 15);
  return (baseAngle + tilt + 360) % 360;
}

export function getActiveApproachHeading(baseAngle: number, windDir?: number, windStrength?: number): number {
  if (!windStrength || windStrength === 0 || windDir === undefined) return baseAngle;
  const windOrigin = (windDir + 180) % 360; // Where wind comes from
  // Which end of runway faces the wind origin?
  const delta1 = Math.abs(shortestAngleDelta(baseAngle, windOrigin));
  const delta2 = Math.abs(shortestAngleDelta(baseAngle + 180, windOrigin));
  return delta1 <= delta2 ? baseAngle : (baseAngle + 180) % 360;
}

export function createRunway(
  id: string,
  type: RunwayType,
  position: Vec2,
  angle: number,
  label: string
): Runway {
  const dims: Record<RunwayType, { length: number; width: number }> = {
    short:   { length: 120, width: 18 },
    long:    { length: 170, width: 22 },
    helipad: { length: 50,  width: 50 },
  };
  const { length, width } = dims[type];
  return {
    id,
    type,
    position,
    angle,
    length,
    width,
    label,
    isOpen: true,
    closedUntil: 0,
  };
}

// ── Canvas rendering helpers ─────────────────────────────────

export function drawRunway(ctx: CanvasRenderingContext2D, runway: Runway, now: number, windDir?: number, windStrength?: number): void {
  const { position, type, length, width, label, isOpen, closedUntil } = runway;
  const angle = getDynamicRunwayAngle(runway.angle, windDir, windStrength);
  const closed = !isOpen || (closedUntil > 0 && now < closedUntil);

  // Determine which end is active (into-wind approach)
  const activeHeading = getActiveApproachHeading(angle, windDir, windStrength);
  // If activeHeading equals the base angle, aircraft approach from the -X end (threshold at -length/2)
  // If activeHeading is the reverse, aircraft approach from the +X end (threshold at +length/2)
  const activeAtNegativeEnd = Math.abs(shortestAngleDelta(activeHeading, angle)) < 90;

  // Parse label into the two runway numbers, e.g. "09L/27R" → ["09L","27R"]
  const parts = label.split('/');
  const negLabel = parts[0] ?? label;   // label for the -X end (base angle direction)
  const posLabel = parts[1] ?? '';      // label for the +X end (reverse direction)

  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(headingToAngle(angle));

  if (type === 'helipad') {
    drawHelipad(ctx, width, closed);
    // Helipad closed label in world space
    if (closed) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = 'bold 11px "JetBrains Mono","Courier New",monospace';
      ctx.fillStyle = 'rgba(255,0,60,0.9)';
      ctx.textAlign = 'center';
      ctx.fillText('CLOSED', position.x, position.y - width / 2 - 8);
    }
  } else {
    drawStrip(ctx, length, width, closed, activeAtNegativeEnd);

    if (!closed) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // ── Designator numbers at each threshold ──────────────
      ctx.font = 'bold 14px "JetBrains Mono", "Courier New", monospace';

      // Active end: cyan + glow
      const activeX = activeAtNegativeEnd ? -length / 2 + 2 : length / 2 - 2;
      ctx.fillStyle = '#00F0FF';
      ctx.shadowColor = 'rgba(0,240,255,0.8)';
      ctx.shadowBlur = 7;
      ctx.fillText(activeAtNegativeEnd ? negLabel : posLabel, activeX, -width / 2 - 11);
      ctx.shadowBlur = 0;

      // Inactive end: dim white
      if (posLabel) {
        const inactiveX = activeAtNegativeEnd ? length / 2 - 2 : -length / 2 + 2;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText(activeAtNegativeEnd ? posLabel : negLabel, inactiveX, -width / 2 - 11);
      }

      // ── Approach arrow: outside the threshold, pointing INTO the runway ─
      // Drawn BEYOND the approach end, arrow points in landing direction
      const ARROW_OFFSET = 22; // px beyond the threshold
      const ARROW_LEN    = 22;
      const ARROW_HEAD   = 8;
      ctx.strokeStyle = '#00F0FF';
      ctx.fillStyle   = '#00F0FF';
      ctx.lineWidth   = 2.5;
      ctx.shadowColor = 'rgba(0,240,255,0.9)';
      ctx.shadowBlur  = 8;

      if (activeAtNegativeEnd) {
        // Aircraft land flying in +X direction → approach from the -X side
        // Arrow placed at x = -length/2 - ARROW_OFFSET, pointing right (+X)
        const ax = -length / 2 - ARROW_OFFSET;
        ctx.beginPath();
        ctx.moveTo(ax - ARROW_LEN / 2, 0);
        ctx.lineTo(ax + ARROW_LEN / 2, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ax + ARROW_LEN / 2, 0);
        ctx.lineTo(ax + ARROW_LEN / 2 - ARROW_HEAD, -ARROW_HEAD * 0.6);
        ctx.lineTo(ax + ARROW_LEN / 2 - ARROW_HEAD,  ARROW_HEAD * 0.6);
        ctx.closePath();
        ctx.fill();
      } else {
        // Aircraft land flying in -X direction → approach from the +X side
        // Arrow placed at x = +length/2 + ARROW_OFFSET, pointing left (-X)
        const ax = length / 2 + ARROW_OFFSET;
        ctx.beginPath();
        ctx.moveTo(ax + ARROW_LEN / 2, 0);
        ctx.lineTo(ax - ARROW_LEN / 2, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ax - ARROW_LEN / 2, 0);
        ctx.lineTo(ax - ARROW_LEN / 2 + ARROW_HEAD, -ARROW_HEAD * 0.6);
        ctx.lineTo(ax - ARROW_LEN / 2 + ARROW_HEAD,  ARROW_HEAD * 0.6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.textBaseline = 'alphabetic';

    } else {
      ctx.font = 'bold 13px "JetBrains Mono","Courier New",monospace';
      ctx.fillStyle = 'rgba(255,0,60,0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CLOSED', 0, -width / 2 - 11);
      ctx.textBaseline = 'alphabetic';
    }
  }

  ctx.restore();
}

function drawStrip(ctx: CanvasRenderingContext2D, length: number, width: number, closed: boolean, activeAtNegativeEnd: boolean): void {
  // Runway body
  ctx.fillStyle = closed ? 'rgba(255,0,60,0.25)' : 'rgba(255,255,255,0.15)';
  ctx.fillRect(-length / 2, -width / 2, length, width);

  // Outline
  ctx.strokeStyle = closed ? '#FF003C' : '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-length / 2, -width / 2, length, width);

  // Centre dashes
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = closed ? 'rgba(255,0,60,0.6)' : 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-length / 2 + 6, 0);
  ctx.lineTo(length / 2 - 6, 0);
  ctx.stroke();
  ctx.setLineDash([]);

  if (!closed) {
    // Threshold markings at the ACTIVE approach end
    // Aircraft approach this end → markings here show where to touch down
    const thresholdX = activeAtNegativeEnd ? -length / 2 + 4 : length / 2 - 14;
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(thresholdX, i * (width / 5));
      ctx.lineTo(thresholdX + 10, i * (width / 5));
      ctx.stroke();
    }

    // Displaced threshold arrow pointing inward from active end
    ctx.strokeStyle = 'rgba(0,240,255,0.5)';
    ctx.lineWidth = 1.5;
    const arrowX = activeAtNegativeEnd ? -length / 2 + 16 : length / 2 - 16;
    const arrowDir = activeAtNegativeEnd ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(arrowX, 0);
    ctx.lineTo(arrowX + arrowDir * 8, -4);
    ctx.moveTo(arrowX, 0);
    ctx.lineTo(arrowX + arrowDir * 8, 4);
    ctx.stroke();
  }
}

function drawHelipad(ctx: CanvasRenderingContext2D, size: number, closed: boolean): void {
  const r = size / 2;

  // Outer circle
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = closed ? 'rgba(255,0,60,0.2)' : 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.strokeStyle = closed ? '#FF003C' : '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();

  // "H" letter
  ctx.font = `bold ${size * 0.5}px "JetBrains Mono","Courier New",monospace`;
  ctx.fillStyle = closed ? '#FF003C' : '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(closed ? 'X' : 'H', 0, 0);
  ctx.textBaseline = 'alphabetic';
}

// ── Active threshold world-space position ────────────────────
/** Returns the position of the active approach threshold in world coordinates.
 *  Aircraft must be near this point (not just anywhere on the runway) to land. */
export function getActiveThresholdPosition(
  runway: Runway,
  windDir?: number,
  windStrength?: number
): Vec2 {
  const angle = getDynamicRunwayAngle(runway.angle, windDir, windStrength);
  const activeHeading = getActiveApproachHeading(angle, windDir, windStrength);
  const activeAtNegativeEnd = Math.abs(shortestAngleDelta(activeHeading, angle)) < 90;
  const rad = headingToAngle(angle);
  const sign = activeAtNegativeEnd ? -1 : 1;
  return {
    x: runway.position.x + Math.cos(rad) * (runway.length / 2) * sign,
    y: runway.position.y + Math.sin(rad) * (runway.length / 2) * sign,
  };
}

// ── Landing check helper ─────────────────────────────────────
export function isOnRunway(pos: Vec2, runway: Runway, windDir?: number, windStrength?: number): boolean {
  if (runway.type === 'helipad') {
    const dx = pos.x - runway.position.x;
    const dy = pos.y - runway.position.y;
    return Math.sqrt(dx * dx + dy * dy) < runway.width / 2 + 25;
  }
  // Rotate point into runway local space
  const angle = getDynamicRunwayAngle(runway.angle, windDir, windStrength);
  const rad = headingToAngle(angle);
  const dx = pos.x - runway.position.x;
  const dy = pos.y - runway.position.y;
  const localX = dx * Math.cos(-rad) - dy * Math.sin(-rad);
  const localY = dx * Math.sin(-rad) + dy * Math.cos(-rad);
  return (
    Math.abs(localX) < runway.length / 2 + 35 &&
    Math.abs(localY) < runway.width / 2 + 25
  );
}
