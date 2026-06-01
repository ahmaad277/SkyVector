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
    short:   { length: 80,  width: 12 },
    long:    { length: 120, width: 16 },
    helipad: { length: 36,  width: 36 },
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

  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(headingToAngle(angle));

  if (type === 'helipad') {
    drawHelipad(ctx, width, closed);
  } else {
    drawStrip(ctx, length, width, closed);
  }

  // Label
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.fillStyle = closed ? 'rgba(255,0,60,0.9)' : 'rgba(255,255,255,0.95)';
  ctx.textAlign = 'center';
  ctx.fillText(closed ? `⛔ ${label} CLOSED` : label, position.x, position.y - width / 2 - 10);

  ctx.restore();
}

function drawStrip(ctx: CanvasRenderingContext2D, length: number, width: number, closed: boolean): void {
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

  // Threshold markers
  if (!closed) {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      const bx = -length / 2 + 4;
      ctx.beginPath();
      ctx.moveTo(bx, i * (width / 5));
      ctx.lineTo(bx + 10, i * (width / 5));
      ctx.stroke();
    }
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
  ctx.font = `bold ${size * 0.55}px "Courier New", monospace`;
  ctx.fillStyle = closed ? '#FF003C' : '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(closed ? 'X' : 'H', 0, 0);
  ctx.textBaseline = 'alphabetic';
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
