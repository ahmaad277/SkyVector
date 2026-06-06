import { useRef, useEffect, useCallback } from 'react';
import type { GameState, Aircraft, Runway, Vec2 } from '../types/game.types';
import { COLORS, getAircraftColor, getFuelColor, getRingColor } from '../utils/colorPalette';
import { drawRunway, isOnRunway } from '../entities/Runway';
import { isSeparationViolated } from '../entities/Aircraft';
import { canvasPoint, vecDist, headingToAngle } from '../utils/pathMath';
import { AIRCRAFT_STATS } from '../entities/Aircraft';
import { LEVELS } from '../levels';

// ── Logical canvas size (all positions in GDD use this) ──────
const LOGICAL_W = 800;

interface RadarScreenProps {
  gameStateRef: React.MutableRefObject<GameState>;
  onPathDrawn: (aircraftId: string, path: Vec2[]) => void;
  onAircraftSelected: (id: string | null) => void;
  onHoldingToggle: (aircraftId: string) => void;
  onAltitudeChange: (aircraftId: string, altitude: 1 | 2 | 3) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export default function RadarScreen({
  gameStateRef,
  onPathDrawn,
  onAircraftSelected,
  onHoldingToggle,
  onAltitudeChange,
  onCanvasReady,
}: RadarScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef<{ active: boolean; points: Vec2[]; aircraftId: string | null }>({
    active: false,
    points: [],
    aircraftId: null,
  });
  const lastTapRef = useRef<{ time: number; id: string | null }>({ time: 0, id: null });

  // ── Notify parent when canvas is ready ───────────────────
  useEffect(() => {
    if (canvasRef.current && onCanvasReady) {
      onCanvasReady(canvasRef.current);
    }
  }, [onCanvasReady]);

  // ── Resize handler ────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const parentW = parent.clientWidth;
      const parentH = parent.clientHeight;
      canvas.width = LOGICAL_W;
      canvas.height = LOGICAL_W * (parentH / parentW);
      canvas.style.width = `${parentW}px`;
      canvas.style.height = `${parentH}px`;
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener('resize', resize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  // ── Hit-test: find aircraft near a point ──────────────────
  const findAircraftAt = useCallback((pos: Vec2): Aircraft | null => {
    const state = gameStateRef.current;
    const HIT_RADIUS = 45;
    for (const ac of state.aircraft) {
      if (ac.state === 'landed' || ac.state === 'crashed') continue;
      if (vecDist(pos, ac.position) < HIT_RADIUS) return ac;
    }
    return null;
  }, [gameStateRef]);

  // ── Pointer helpers ───────────────────────────────────────
  const getPos = useCallback((e: MouseEvent | Touch): Vec2 => {
    const canvas = canvasRef.current!;
    return canvasPoint(e, canvas);
  }, []);

  // ── Mouse events ──────────────────────────────────────────
  const onMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault();
    const state = gameStateRef.current;
    if (state.phase !== 'playing') return;
    const pos = getPos(e);

    if (state.selectedAircraftId && state.level >= 4) {
      const selectedAc = state.aircraft.find(a => a.id === state.selectedAircraftId);
      if (selectedAc) {
        const stats = AIRCRAFT_STATS[selectedAc.type];
        const startX = selectedAc.position.x + stats.size + 15;
        const startY = selectedAc.position.y - 40;
        const btnW = 40;
        const btnH = 20;
        
        for (let i = 0; i < 3; i++) {
          const alt = (3 - i) as 1 | 2 | 3;
          const y = startY + i * (btnH + 5);
          if (pos.x >= startX && pos.x <= startX + btnW && pos.y >= y && pos.y <= y + btnH) {
            onAltitudeChange(selectedAc.id, alt);
            return;
          }
        }
      }
    }

    const ac = findAircraftAt(pos);

    if (ac && !ac.isNORDO) {
      // Double-click = toggle holding
      const now = Date.now();
      if (lastTapRef.current.id === ac.id && now - lastTapRef.current.time < 350) {
        onHoldingToggle(ac.id);
        lastTapRef.current = { time: 0, id: null };
        return;
      }
      lastTapRef.current = { time: now, id: ac.id };

      drawingRef.current = { active: true, points: [pos], aircraftId: ac.id };
      onAircraftSelected(ac.id);
    } else {
      onAircraftSelected(null);
      drawingRef.current = { active: false, points: [], aircraftId: null };
    }
  }, [gameStateRef, findAircraftAt, getPos, onAircraftSelected, onHoldingToggle, onAltitudeChange]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!drawingRef.current.active) return;
    e.preventDefault();
    const pos = getPos(e);
    drawingRef.current.points.push(pos);
    // Update preview path in game state
    gameStateRef.current = {
      ...gameStateRef.current,
      drawingPath: drawingRef.current.points,
      isDrawing: true,
    };
  }, [gameStateRef, getPos]);

  const onMouseUp = useCallback((e: MouseEvent) => {
    e.preventDefault();
    if (!drawingRef.current.active || !drawingRef.current.aircraftId) return;
    const raw = drawingRef.current.points;
    if (raw.length > 2) {
      onPathDrawn(drawingRef.current.aircraftId, raw);
    }
    drawingRef.current = { active: false, points: [], aircraftId: null };
    gameStateRef.current = { ...gameStateRef.current, drawingPath: [], isDrawing: false };
  }, [gameStateRef, onPathDrawn]);

  // ── Touch events ──────────────────────────────────────────
  const onTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const state = gameStateRef.current;
    if (state.phase !== 'playing') return;
    const touch = e.touches[0];
    const pos = getPos(touch);

    if (state.selectedAircraftId && state.level >= 4) {
      const selectedAc = state.aircraft.find(a => a.id === state.selectedAircraftId);
      if (selectedAc) {
        const stats = AIRCRAFT_STATS[selectedAc.type];
        const startX = selectedAc.position.x + stats.size + 15;
        const startY = selectedAc.position.y - 40;
        const btnW = 40;
        const btnH = 20;
        
        for (let i = 0; i < 3; i++) {
          const alt = (3 - i) as 1 | 2 | 3;
          const y = startY + i * (btnH + 5);
          if (pos.x >= startX && pos.x <= startX + btnW && pos.y >= y && pos.y <= y + btnH) {
            onAltitudeChange(selectedAc.id, alt);
            return;
          }
        }
      }
    }

    const ac = findAircraftAt(pos);

    if (ac && !ac.isNORDO) {
      const now = Date.now();
      if (lastTapRef.current.id === ac.id && now - lastTapRef.current.time < 350) {
        onHoldingToggle(ac.id);
        lastTapRef.current = { time: 0, id: null };
        return;
      }
      lastTapRef.current = { time: now, id: ac.id };
      drawingRef.current = { active: true, points: [pos], aircraftId: ac.id };
      onAircraftSelected(ac.id);
    }
  }, [gameStateRef, findAircraftAt, getPos, onAircraftSelected, onHoldingToggle, onAltitudeChange]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (!drawingRef.current.active) return;
    const touch = e.touches[0];
    const pos = getPos(touch);
    drawingRef.current.points.push(pos);
    gameStateRef.current = {
      ...gameStateRef.current,
      drawingPath: drawingRef.current.points,
      isDrawing: true,
    };
  }, [gameStateRef, getPos]);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (!drawingRef.current.active || !drawingRef.current.aircraftId) return;
    const raw = drawingRef.current.points;
    if (raw.length > 2) {
      onPathDrawn(drawingRef.current.aircraftId, raw);
    }
    drawingRef.current = { active: false, points: [], aircraftId: null };
    gameStateRef.current = { ...gameStateRef.current, drawingPath: [], isDrawing: false };
  }, [gameStateRef, onPathDrawn]);

  // ── Register events ───────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [onMouseDown, onMouseMove, onMouseUp, onTouchStart, onTouchMove, onTouchEnd]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', cursor: 'crosshair', touchAction: 'none' }}
    />
  );
}

// ══════════════════════════════════════════════════════════════
// RENDERER — called every frame by the game loop
// ══════════════════════════════════════════════════════════════
export function renderFrame(state: GameState, canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const now = Date.now();
  const config = LEVELS[state.level - 1] ?? LEVELS[0];

  // ── Background ────────────────────────────────────────────
  ctx.save();
  if (state.screenShakeUntil && now < state.screenShakeUntil) {
    const shakeX = (Math.random() - 0.5) * 10;
    const shakeY = (Math.random() - 0.5) * 10;
    ctx.translate(shakeX, shakeY);
  }

  ctx.fillStyle = COLORS.BG_DEEP;
  ctx.fillRect(0, 0, W, H);

  // ── Radar Grid ────────────────────────────────────────────
  drawRadarGrid(ctx, W, H);

  // ── IFR: dim everything except near sweep ─────────────────
  if (config.hasRadarSweep) {
    drawRadarSweep(ctx, W, H, state.radarAngle);
  }

  // ── Event overlay ─────────────────────────────────────────
  if (state.activeEvent) {
    drawEventOverlay(ctx, W, H, state);
  }

  // ── Runways ───────────────────────────────────────────────
  for (const runway of state.runways) {
    drawRunway(ctx, runway, now, state.windDirection, state.windStrength);
  }

  // ── Bird Strike Zone ──────────────────────────────────────
  if (state.activeEvent?.type === 'bird_strike' && state.activeEvent.payload?.birdStrikeZone) {
    drawBirdStrikeZone(ctx, state.activeEvent.payload.birdStrikeZone);
  }

  // ── Flight paths (drawn) ──────────────────────────────────
  for (const ac of state.aircraft) {
    if (ac.path.length > 1 && ac.state !== 'landed') {
      let isConnected = false;
      if (ac.targetAirportId) {
        const lastPoint = ac.path[ac.path.length - 1];
        isConnected = getAcceptingAirportRunways(state, ac).some((runway) =>
          isOnRunway(lastPoint, runway, state.windDirection, state.windStrength)
        );
      }
      const { alpha, colorOverride } = getPhosphorState(ac, state, W, H);
      drawFlightPath(ctx, ac, state.selectedAircraftId === ac.id, isConnected, alpha, colorOverride);
    }
  }

  // ── Preview path (currently drawing) ─────────────────────
  if (state.isDrawing && state.drawingPath.length > 1) {
    let isConnected = false;
    const selectedAc = state.aircraft.find(a => a.id === state.selectedAircraftId);
    if (selectedAc?.targetAirportId) {
      const lastPoint = state.drawingPath[state.drawingPath.length - 1];
      isConnected = getAcceptingAirportRunways(state, selectedAc).some((runway) =>
        isOnRunway(lastPoint, runway, state.windDirection, state.windStrength)
      );
    }
    drawPreviewPath(ctx, state.drawingPath, isConnected);
  }

  // ── Aircraft ──────────────────────────────────────────────
  for (const ac of state.aircraft) {
    if (ac.state === 'landed') {
      if (ac.landedTime) {
        const elapsed = now - ac.landedTime;
        if (elapsed < 3000) {
          const alpha = 1 - elapsed / 3000;
          const scale = 1 - elapsed / 3000;
          drawAircraft(ctx, ac, state, alpha, null, scale);
        }
      }
      continue;
    }
    const { alpha, colorOverride } = getPhosphorState(ac, state, W, H);
    drawAircraft(ctx, ac, state, alpha, colorOverride, 1);
  }

  // ── Score Popups ──────────────────────────────────────────
  for (const popup of state.scorePopups ?? []) {
    const elapsed = now - popup.createdAt;
    const alpha = 1 - elapsed / 1500;
    const floatY = popup.position.y - (elapsed / 1500) * 30;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 18px "JetBrains Mono"';
    ctx.fillStyle = COLORS.HUD_GOLD;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(`+${popup.score}`, popup.position.x, floatY);
    ctx.restore();
  }

  // ── Scanlines overlay (CRT aesthetic) ────────────────────
  drawScanlines(ctx, W, H);
  ctx.restore(); // Restore screen shake translation
}

// ── Grid ─────────────────────────────────────────────────────
function drawRadarGrid(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const cx = W / 2, cy = H / 2;
  ctx.strokeStyle = COLORS.RADAR_GRID;
  ctx.lineWidth = 1;

  // Concentric circles
  for (let r = 60; r < Math.max(W, H); r += 60) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Cross lines
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();

  // Diagonal lines
  ctx.strokeStyle = 'rgba(45, 55, 72, 0.05)';
  const steps = 6;
  for (let i = 1; i < steps; i++) {
    const x = (W / steps) * i;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    const y = (H / steps) * i;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
}

// ── Radar Sweep ───────────────────────────────────────────────
function drawRadarSweep(ctx: CanvasRenderingContext2D, W: number, H: number, angleDeg: number) {
  const cx = W / 2, cy = H / 2;
  const maxR = Math.sqrt(W * W + H * H);
  const angleRad = (angleDeg * Math.PI) / 180;
  const spread = (25 * Math.PI) / 180;

  // Draw sweep wedge manually
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, maxR, angleRad - spread, angleRad);
  ctx.closePath();
  const sweepGrad = ctx.createLinearGradient(cx, cy, cx + Math.cos(angleRad) * maxR, cy + Math.sin(angleRad) * maxR);
  sweepGrad.addColorStop(0, 'rgba(57, 255, 20, 0.0)');
  sweepGrad.addColorStop(0.6, 'rgba(57, 255, 20, 0.08)');
  sweepGrad.addColorStop(1, 'rgba(57, 255, 20, 0.3)');
  ctx.fillStyle = sweepGrad;
  ctx.fill();
  ctx.restore();

  // Leading edge line
  ctx.save();
  ctx.strokeStyle = 'rgba(57, 255, 20, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angleRad) * maxR, cy + Math.sin(angleRad) * maxR);
  ctx.stroke();
  ctx.restore();
}

// ── Event overlay ─────────────────────────────────────────────
function drawEventOverlay(ctx: CanvasRenderingContext2D, W: number, H: number, _state: GameState) {
  ctx.save();
  ctx.fillStyle = COLORS.EVENT_OVERLAY;
  ctx.fillRect(0, 0, W, H);

  // Pulsing border
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
  ctx.strokeStyle = `rgba(255, 0, 60, ${0.3 + pulse * 0.3})`;
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  ctx.restore();
}

// ── Bird Strike Zone ──────────────────────────────────────────
function drawBirdStrikeZone(
  ctx: CanvasRenderingContext2D,
  zone: { center: { x: number; y: number }; radius: number }
) {
  ctx.save();
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 400);
  ctx.beginPath();
  ctx.arc(zone.center.x, zone.center.y, zone.radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 165, 0, ${0.5 + pulse * 0.4})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(255, 165, 0, 0.07)';
  ctx.fill();

  ctx.font = 'bold 11px "JetBrains Mono","Courier New",monospace';
  ctx.fillStyle = 'rgba(255,165,0,0.9)';
  ctx.textAlign = 'center';
  ctx.fillText('BIRD STRIKE', zone.center.x, zone.center.y - zone.radius - 6);
  ctx.restore();
}

// ── Flight path ───────────────────────────────────────────────
function drawFlightPath(ctx: CanvasRenderingContext2D, ac: Aircraft, selected: boolean, isConnected: boolean, alpha: number, colorOverride: string | null) {
  if (ac.path.length < 2 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colorOverride || (isConnected ? '#00B4D8' : (selected ? COLORS.PATH_ACTIVE : COLORS.PATH_PREVIEW));
  ctx.lineWidth = selected ? 2 : 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();

  // Draw only the remaining portion (after pathProgress)
  const pathProgress = ac.pathProgress;
  const startIdx = Math.floor(pathProgress * (ac.path.length - 1));
  ctx.moveTo(ac.path[startIdx].x, ac.path[startIdx].y);
  for (let i = startIdx + 1; i < ac.path.length; i++) {
    ctx.lineTo(ac.path[i].x, ac.path[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Destination dot
  const last = ac.path[ac.path.length - 1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = colorOverride || (isConnected ? '#00B4D8' : (selected ? COLORS.PATH_ACTIVE : COLORS.PATH_PREVIEW));
  ctx.fill();
  ctx.restore();
}

// ── Preview path (while drawing) ─────────────────────────────
function drawPreviewPath(ctx: CanvasRenderingContext2D, points: Vec2[], isConnected: boolean) {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = isConnected ? '#00B4D8' : 'rgba(0,255,65,0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function getAcceptingAirportRunways(state: GameState, ac: Aircraft): Runway[] {
  return state.runways.filter((runway) => {
    if (runway.airportId !== ac.targetAirportId) return false;
    if (ac.type === 'helicopter') return runway.type === 'helipad';
    if (ac.type === 'cessna') return runway.type === 'short' || runway.type === 'long';
    return runway.type === 'long';
  });
}

// ── Aircraft visibility (IFR mode) ───────────────────────────
function getPhosphorState(ac: Aircraft, state: GameState, W: number, H: number): { alpha: number, colorOverride: string | null } {
  const config = LEVELS[state.level - 1] ?? LEVELS[0];
  if (!config.hasRadarSweep) return { alpha: 1, colorOverride: null };

  const cx = W / 2, cy = H / 2;
  const sweepAngle = (state.radarAngle * Math.PI) / 180;
  const acAngle = Math.atan2(ac.position.y - cy, ac.position.x - cx);
  
  // How many radians ago did the sweep pass the aircraft?
  let diff = sweepAngle - acAngle;
  while (diff < 0) diff += Math.PI * 2;
  while (diff >= Math.PI * 2) diff -= Math.PI * 2;

  const diffDeg = (diff * 180) / Math.PI;

  if (diffDeg <= 40) {
    return { alpha: 1.0, colorOverride: '#39FF14' };
  } else if (diffDeg <= 320) {
    const t = 1 - (diffDeg - 40) / 280;
    return { alpha: t, colorOverride: '#FFFFFF' };
  } else {
    return { alpha: 0, colorOverride: null };
  }
}

// ── Aircraft drawing ──────────────────────────────────────────
function drawAircraft(
  ctx: CanvasRenderingContext2D,
  ac: Aircraft,
  state: GameState,
  alpha: number,
  colorOverride: string | null,
  scale: number = 1
) {
  if (alpha <= 0) return;
  const stats = AIRCRAFT_STATS[ac.type];
  const color = colorOverride || getAircraftColor(ac.type, ac.isEmergency, ac.isNORDO);
  const selected = state.selectedAircraftId === ac.id;

  // Check separation warnings
  const otherAircraft = state.aircraft.filter((o) => o.id !== ac.id && o.state !== 'landed' && o.state !== 'crashed');
  const hasWarning = otherAircraft.some(
    (o) => o.altitude === ac.altitude && isSeparationViolated(ac, o)
  );
  const ringStatus = hasWarning ? 'warning' : 'none';

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(ac.position.x, ac.position.y);
  ctx.scale(scale, scale);

  // ── Separation ring ────────────────────────────────────────
  ctx.beginPath();
  ctx.arc(0, 0, ac.separationRadius, 0, Math.PI * 2);
  ctx.fillStyle = getRingColor(hasWarning ? 'warning' : 'none');
  ctx.fill();
  ctx.strokeStyle = getRingColor(ringStatus);
  ctx.lineWidth = hasWarning ? 2 : 1;
  ctx.stroke();

  // ── Fuel Pulse Ring ────────────────────────────────────────
  if (ac.fuel <= 20 && ac.state !== 'landed') {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / (ac.fuel > 0 ? 100 : 50));
    ctx.beginPath();
    ctx.arc(0, 0, stats.size * 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 0, 60, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // ── Holding ring ───────────────────────────────────────────
  if (ac.state === 'holding' && ac.holdingCenter) {
    ctx.save();
    ctx.translate(-ac.position.x + ac.holdingCenter.x, -ac.position.y + ac.holdingCenter.y);
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.HOLDING_RING;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ── Aircraft shape ─────────────────────────────────────────
  ctx.rotate(headingToAngle(ac.heading));
  drawAircraftShape(ctx, ac.type, stats.size, color, selected);
  ctx.rotate(-headingToAngle(ac.heading));

  // ── Callsign label (right of aircraft) ─────────────────────
  ctx.font = `bold 16px "JetBrains Mono","Courier New",monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.fillText(ac.callsign, stats.size + 8, -stats.size + 4);

  // ── Target airport — centred BELOW the aircraft in blue ──
  if (ac.targetAirportId) {
    const config = LEVELS[state.level - 1] ?? LEVELS[0];
    const airportCode = config.airport.id === ac.targetAirportId ? config.airport.icao : ac.targetAirportId.toUpperCase();

    ctx.font = `bold 14px "JetBrains Mono","Courier New",monospace`;
    ctx.fillStyle = colorOverride || '#00F0FF';
    ctx.textAlign = 'center';
    ctx.shadowColor = colorOverride ? 'rgba(255,255,255,0.65)' : 'rgba(0,240,255,0.65)';
    ctx.shadowBlur = 5;
    ctx.fillText(airportCode, 0, stats.size + 18);
    ctx.shadowBlur = 0;
  }

  // ── Fuel bar ───────────────────────────────────────────────
  drawFuelBar(ctx, ac, stats.size, colorOverride);

  // ── Emergency / VIP badge ──────────────────────────────────
  if (ac.isEmergency || ac.isNORDO) {
    const timeInAir = Date.now() - ac.spawnTime;
    
    // Calculate allowed time based on distance to nearest runway
    let minDistance = Infinity;
    for (const runway of state.runways) {
      const dx = ac.position.x - runway.position.x;
      const dy = ac.position.y - runway.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDistance) minDistance = dist;
    }
    
    // Base time 50s (Emergency) / 60s (VIP) + up to 30s based on distance
    const baseTime = ac.isEmergency ? 50000 : 60000;
    const allowedTimeMs = baseTime + (Math.min(minDistance, 800) / 800) * 30000;
    const timeLeft = Math.max(0, Math.ceil((allowedTimeMs - timeInAir) / 1000));
    const timerText = `${timeLeft}s`;

    if (ac.isEmergency) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
      ctx.font = `bold ${15 + pulse * 2}px "JetBrains Mono","Courier New",monospace`;
      ctx.fillStyle = colorOverride || `rgba(255,0,60,${0.9 + pulse * 0.1})`;
      ctx.textAlign = 'center';
      ctx.shadowColor = colorOverride ? 'rgba(255,255,255,0.65)' : 'rgba(255,0,60,0.8)';
      ctx.shadowBlur = 8;
      ctx.fillText(`⚠ MAYDAY [${timerText}]`, 0, -stats.size - 16);
      ctx.shadowBlur = 0;
    } else if (ac.isNORDO) {
      ctx.font = 'bold 14px "JetBrains Mono","Courier New",monospace';
      ctx.fillStyle = colorOverride || COLORS.HUD_GOLD;
      ctx.textAlign = 'center';
      ctx.shadowColor = colorOverride ? 'rgba(255,255,255,0.65)' : 'rgba(255,215,0,0.7)';
      ctx.shadowBlur = 6;
      ctx.fillText(`★ NORDO [${timerText}]`, 0, -stats.size - 16);
      ctx.shadowBlur = 0;
    }
  }

  // ── Altitude Menu (Level 4+) ───────────────────────────────
  if (state.level >= 4) {
    if (selected) {
      const options = [3, 2, 1];
      const btnW = 40;
      const btnH = 20;
      const startX = stats.size + 15;
      const startY = -40;

      ctx.font = 'bold 12px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      options.forEach((alt, i) => {
        const y = startY + i * (btnH + 5);
        ctx.fillStyle = ac.targetAltitude === alt ? 'rgba(0, 240, 255, 0.8)' : 'rgba(11, 19, 43, 0.8)';
        ctx.strokeStyle = ac.targetAltitude === alt ? '#fff' : '#00F0FF';
        ctx.lineWidth = 1.5;
        ctx.fillRect(startX, y, btnW, btnH);
        ctx.strokeRect(startX, y, btnW, btnH);

        ctx.fillStyle = ac.targetAltitude === alt ? '#000' : '#00F0FF';
        ctx.fillText(`FL${alt}`, startX + btnW / 2, y + btnH / 2);
      });
    } else {
      // Just show current altitude
      ctx.font = 'bold 12px "JetBrains Mono"';
      ctx.fillStyle = colorOverride || '#00F0FF';
      ctx.textAlign = 'left';
      ctx.fillText(`FL${ac.altitude}`, stats.size + 8, -stats.size - 8);
    }
  }

  ctx.restore();
}

function drawAircraftShape(
  ctx: CanvasRenderingContext2D,
  type: string,
  size: number,
  color: string,
  selected: boolean
) {
  const s = size;
  ctx.fillStyle = color;
  ctx.strokeStyle = selected ? '#2D3748' : color;
  ctx.lineWidth = selected ? 2.5 : 1.5;

  switch (type) {
    case 'cessna': {
      // Top-down Cessna: high-wing prop plane
      // Fuselage
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.9, s * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      // Main wings (straight high-wing)
      ctx.beginPath();
      ctx.moveTo(s * 0.05, -s * 0.18);
      ctx.lineTo(-s * 0.25, -s * 1.0);
      ctx.lineTo(-s * 0.55, -s * 1.0);
      ctx.lineTo(-s * 0.6, -s * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.05, s * 0.18);
      ctx.lineTo(-s * 0.25, s * 1.0);
      ctx.lineTo(-s * 0.55, s * 1.0);
      ctx.lineTo(-s * 0.6, s * 0.18);
      ctx.closePath();
      ctx.fill();
      // Tail horizontal stabiliser
      ctx.beginPath();
      ctx.moveTo(-s * 0.72, -s * 0.15);
      ctx.lineTo(-s * 0.85, -s * 0.52);
      ctx.lineTo(-s * 1.0, -s * 0.52);
      ctx.lineTo(-s * 0.92, -s * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.72, s * 0.15);
      ctx.lineTo(-s * 0.85, s * 0.52);
      ctx.lineTo(-s * 1.0, s * 0.52);
      ctx.lineTo(-s * 0.92, s * 0.15);
      ctx.closePath();
      ctx.fill();
      // Prop dot
      ctx.beginPath();
      ctx.arc(s * 0.92, 0, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = '#2D3748';
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 1.2, s * 1.2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }

    case 'jetliner': {
      // Top-down commercial airliner
      // Fuselage (long tube)
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 1.1, s * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      // Swept main wings
      ctx.beginPath();
      ctx.moveTo(s * 0.15, -s * 0.2);
      ctx.lineTo(-s * 0.45, -s * 1.1);
      ctx.lineTo(-s * 0.75, -s * 1.1);
      ctx.lineTo(-s * 0.65, -s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.15, s * 0.2);
      ctx.lineTo(-s * 0.45, s * 1.1);
      ctx.lineTo(-s * 0.75, s * 1.1);
      ctx.lineTo(-s * 0.65, s * 0.2);
      ctx.closePath();
      ctx.fill();
      // Engine pods on wings
      ctx.beginPath();
      ctx.ellipse(-s * 0.25, -s * 0.65, s * 0.2, s * 0.09, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-s * 0.25, s * 0.65, s * 0.2, s * 0.09, 0.4, 0, Math.PI * 2);
      ctx.fill();
      // Tail
      ctx.beginPath();
      ctx.moveTo(-s * 0.88, -s * 0.18);
      ctx.lineTo(-s * 1.0, -s * 0.55);
      ctx.lineTo(-s * 1.12, -s * 0.55);
      ctx.lineTo(-s * 1.05, -s * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.88, s * 0.18);
      ctx.lineTo(-s * 1.0, s * 0.55);
      ctx.lineTo(-s * 1.12, s * 0.55);
      ctx.lineTo(-s * 1.05, s * 0.18);
      ctx.closePath();
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = '#2D3748';
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 1.4, s * 1.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }

    case 'fighter': {
      // Top-down F-16 style delta-wing fighter
      // Fuselage (sleek pointed)
      ctx.beginPath();
      ctx.moveTo(s * 1.2, 0);
      ctx.quadraticCurveTo(s * 0.5, -s * 0.18, -s * 0.8, -s * 0.18);
      ctx.lineTo(-s * 1.1, -s * 0.1);
      ctx.lineTo(-s * 1.1, s * 0.1);
      ctx.lineTo(-s * 0.8, s * 0.18);
      ctx.quadraticCurveTo(s * 0.5, s * 0.18, s * 1.2, 0);
      ctx.closePath();
      ctx.fill();
      // Delta wings
      ctx.beginPath();
      ctx.moveTo(s * 0.6, -s * 0.15);
      ctx.lineTo(-s * 0.4, -s * 1.05);
      ctx.lineTo(-s * 0.75, -s * 1.05);
      ctx.lineTo(-s * 0.85, -s * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.6, s * 0.15);
      ctx.lineTo(-s * 0.4, s * 1.05);
      ctx.lineTo(-s * 0.75, s * 1.05);
      ctx.lineTo(-s * 0.85, s * 0.15);
      ctx.closePath();
      ctx.fill();
      // Small canards
      ctx.beginPath();
      ctx.moveTo(s * 0.55, -s * 0.15);
      ctx.lineTo(s * 0.2, -s * 0.55);
      ctx.lineTo(s * 0.05, -s * 0.55);
      ctx.lineTo(s * 0.18, -s * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.55, s * 0.15);
      ctx.lineTo(s * 0.2, s * 0.55);
      ctx.lineTo(s * 0.05, s * 0.55);
      ctx.lineTo(s * 0.18, s * 0.15);
      ctx.closePath();
      ctx.fill();
      // Afterburner glow
      const glowGrad = ctx.createRadialGradient(-s * 1.1, 0, 0, -s * 1.1, 0, s * 0.35);
      glowGrad.addColorStop(0, 'rgba(255,120,0,0.8)');
      glowGrad.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.ellipse(-s * 1.25, 0, s * 0.3, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      if (selected) {
        ctx.strokeStyle = '#2D3748';
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 1.35, s * 1.35, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }

    case 'helicopter': {
      // Top-down helicopter with rotor disc
      // Rotor disc (semi-transparent)
      const rotorAngle = (Date.now() / 120) % (Math.PI * 2);
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.05, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();

      // Rotor blades (spinning)
      ctx.save();
      ctx.rotate(rotorAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = s * 0.18;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-s * 1.0, 0);
      ctx.lineTo(s * 1.0, 0);
      ctx.stroke();
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(-s * 1.0, 0);
      ctx.lineTo(s * 1.0, 0);
      ctx.stroke();
      ctx.restore();
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'butt';

      // Fuselage body (rounded)
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(s * 0.05, 0, s * 0.65, s * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tail boom
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, -s * 0.12);
      ctx.lineTo(-s * 1.15, -s * 0.06);
      ctx.lineTo(-s * 1.15, s * 0.06);
      ctx.lineTo(-s * 0.55, s * 0.12);
      ctx.closePath();
      ctx.fill();
      // Tail rotor
      ctx.beginPath();
      ctx.moveTo(-s * 1.15, -s * 0.3);
      ctx.lineTo(-s * 1.15, s * 0.3);
      ctx.strokeStyle = color;
      ctx.lineWidth = s * 0.15;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.lineWidth = 1.5;
      // Cockpit bubble
      ctx.fillStyle = 'rgba(0,200,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(s * 0.35, 0, s * 0.28, s * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = '#2D3748';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, s * 1.2, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }

    default:
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
  }
}

function drawFuelBar(ctx: CanvasRenderingContext2D, ac: Aircraft, size: number, colorOverride: string | null) {
  const barW = size * 2.2;
  const barH = 3;
  const bx = -barW / 2;
  const by = size + 5;
  const fuelPct = ac.fuel / ac.maxFuel;

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(bx, by, barW, barH);

  // Fill
  ctx.fillStyle = colorOverride || getFuelColor(ac.fuel);
  ctx.fillRect(bx, by, barW * fuelPct, barH);

  // Pulsing low-fuel warning
  if (ac.fuel <= 20) {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 150);
    ctx.strokeStyle = colorOverride || `rgba(255,0,60,${pulse})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, barH);
  }
}

// ── CRT Scanlines ─────────────────────────────────────────────
function drawScanlines(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.save();
  ctx.globalAlpha = 1;
  for (let y = 0; y < H; y += 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.fillRect(0, y, W, 1);
  }
  ctx.restore();
}
