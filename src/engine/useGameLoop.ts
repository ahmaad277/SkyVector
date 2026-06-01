import { useEffect, useRef, useCallback } from 'react';
import type { GameState, LevelConfig } from '../types/game.types';
import { updateAircraft } from '../entities/Aircraft';
import { spawnAircraft } from '../entities/AircraftFactory';
import { checkCollisions, checkLandings, updateCombo } from './CollisionEngine';
import {
  shouldTriggerEvent,
  generateEvent,
  applyEventToState,
  expireEvent,
} from './EventBus';
import { LEVELS } from '../levels';
import { getLandingTargetForLevel } from '../utils/levelProgress';


interface UseGameLoopOptions {
  gameStateRef: React.MutableRefObject<GameState>;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  onScoreUpdate: (score: number) => void;
  onComboUpdate: (combo: GameState['combo']) => void;
  onGameOver: (finalScore: number, maxCombo: number, reason: 'collision' | 'fuel' | 'vip_delay') => void;
  onLevelComplete: (level: number) => void;
  onEventTriggered: (event: GameState['activeEvent']) => void;
  onLanding: (callsign: string, isVIP: boolean, isEmergency: boolean) => void;
  renderFrame: (state: GameState, canvas: HTMLCanvasElement) => void;
}

export function useGameLoop(options: UseGameLoopOptions) {
  const {
    gameStateRef,
    canvasRef,
    onScoreUpdate,
    onComboUpdate,
    onGameOver,
    onLevelComplete,
    onEventTriggered,
    onLanding,
    renderFrame,
  } = options;

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const maxComboRef = useRef<number>(1);
  const isRunningRef = useRef<boolean>(false);

  const tick = useCallback(
    (timestamp: number) => {
      if (!isRunningRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      // Cap dt to avoid spiral of death on tab switch
      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTimeRef.current = timestamp;

      const state = gameStateRef.current;
      if (state.phase !== 'playing') {
        renderFrame(state, canvas);
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const now = Date.now();
      const config: LevelConfig = LEVELS[state.level - 1] ?? LEVELS[0];

      // ── 1. Radar sweep ────────────────────────────────────
      const radarSpeed = config.hasRadarSweep ? 240 : 45;
      let newState: GameState = {
        ...state,
        radarAngle: (state.radarAngle + radarSpeed * dt) % 360,
      };

      // ── 2. Spawn new aircraft ─────────────────────────────
      if (
        now - lastSpawnRef.current >= config.spawnRateMs &&
        newState.aircraft.filter((a) => a.state !== 'landed' && a.state !== 'crashed').length <
          config.maxAircraft
      ) {
        const newAc = spawnAircraft(config, canvas.width, canvas.height);
        if (newAc) {
          // If VIP, mark it in state
          if (newAc.isVIP && newState.activeEvent?.type === 'vip_flight') {
            newState.aircraft = [...newState.aircraft, newAc];
          } else {
            newState.aircraft = [...newState.aircraft, newAc];
          }
        }
        lastSpawnRef.current = now;
      }

      // ── 3. Update all aircraft ────────────────────────────
      newState.aircraft = newState.aircraft.map((ac) =>
        updateAircraft(ac, dt, newState.windDirection, newState.windStrength)
      );

      // ── Check for fuel crashes and VIP/Mayday delays ────────
      const fuelCrashed = newState.aircraft.find(a => a.state === 'crashed');
      if (fuelCrashed) {
        isRunningRef.current = false;
        gameStateRef.current = { ...newState, phase: 'gameover', gameOverReason: 'fuel' };
        renderFrame(gameStateRef.current, canvas);
        onGameOver(newState.score, maxComboRef.current, 'fuel');
        return;
      }

      const delayedVIPOrMayday = newState.aircraft.find(a => {
        if ((a.isVIP || a.isEmergency) && a.state !== 'landed' && a.state !== 'crashed') {
          // Calculate distance to nearest runway
          let minDistance = Infinity;
          for (const runway of newState.runways) {
            const dx = a.position.x - runway.position.x;
            const dy = a.position.y - runway.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDistance) minDistance = dist;
          }
          
          // Base time 60s + up to 30s extra based on distance from nearest runway
          const allowedTimeMs = 60000 + (Math.min(minDistance, 800) / 800) * 30000;
          return (now - a.spawnTime > allowedTimeMs);
        }
        return false;
      });

      if (delayedVIPOrMayday) {
        newState.aircraft = newState.aircraft.map(a => 
          a.id === delayedVIPOrMayday.id ? { ...a, state: 'crashed' } : a
        );
        isRunningRef.current = false;
        gameStateRef.current = { ...newState, phase: 'gameover', gameOverReason: 'vip_delay' };
        renderFrame(gameStateRef.current, canvas);
        onGameOver(newState.score, maxComboRef.current, 'vip_delay');
        return;
      }

      // ── 4. Collision & out-of-bounds check ────────────────
      const activeAircraft = newState.aircraft.filter(
        (a) => a.state !== 'landed' && a.state !== 'crashed'
      );
      const { collision, colliderIds, outOfBoundsIds } = checkCollisions(
        activeAircraft,
        canvas.width,
        canvas.height
      );

      if (collision && colliderIds) {
        newState.aircraft = newState.aircraft.map((a) =>
          colliderIds.includes(a.id) ? { ...a, state: 'crashed' } : a
        );
        isRunningRef.current = false;
        gameStateRef.current = { ...newState, phase: 'gameover', gameOverReason: 'collision' };
        renderFrame(gameStateRef.current, canvas);
        onGameOver(newState.score, maxComboRef.current, 'collision');
        return;
      }

      // Remove out-of-bounds aircraft silently
      if (outOfBoundsIds.length > 0) {
        newState.aircraft = newState.aircraft.filter(
          (a) => !outOfBoundsIds.includes(a.id)
        );
      }

      // ── 5. Landing checks ─────────────────────────────────
      const landingResults = checkLandings(newState.aircraft, newState.runways, now, newState.windDirection, newState.windStrength);
      let scoreGain = 0;
      let didLand = false;

      for (const result of landingResults) {
        const combo = updateCombo(newState, now, true);
        const multiplied = result.scoreGain * combo.multiplier;
        scoreGain += multiplied;
        didLand = true;
        newState.combo = combo;
        if (combo.multiplier > maxComboRef.current) maxComboRef.current = combo.multiplier;

        const ac = newState.aircraft.find((a) => a.id === result.aircraftId);
        if (ac) {
          onLanding(ac.callsign, result.isVIP, result.isEmergency);
        }

        newState.aircraft = newState.aircraft.map((a) =>
          a.id === result.aircraftId ? { ...a, state: 'landed' } : a
        );
        newState.totalLandings += 1;
      }

      if (!didLand) {
        newState.combo = updateCombo(newState, now, false);
      }

      if (scoreGain > 0) {
        newState.score += scoreGain;
        onScoreUpdate(newState.score);
      }

      onComboUpdate(newState.combo);

      // ── 6. Events ─────────────────────────────────────────
      newState = expireEvent(newState, now);

      if (shouldTriggerEvent(newState, now)) {
        const event = generateEvent(newState, now);
        newState = applyEventToState(newState, event);
        onEventTriggered(newState.activeEvent);
      }

      // ── 7. Clean up landed / crashed aircraft ─────────────
      newState.aircraft = newState.aircraft.filter(
        (a) => a.state !== 'landed' || Date.now() - a.spawnTime < 3000
      );

      // ── 8. Level complete check ───────────────────────────
      if (newState.totalLandings >= getLandingTargetForLevel(newState.level) && newState.level < LEVELS.length) {
        isRunningRef.current = false;
        gameStateRef.current = { ...newState, phase: 'levelcomplete' };
        renderFrame(gameStateRef.current, canvas);
        onLevelComplete(newState.level);
        return;
      }

      gameStateRef.current = newState;
      renderFrame(newState, canvas);
      rafRef.current = requestAnimationFrame(tick);
    },
    [gameStateRef, canvasRef, onScoreUpdate, onComboUpdate, onGameOver, onLevelComplete, onEventTriggered, onLanding, renderFrame]
  );

  const start = useCallback(() => {
    isRunningRef.current = true;
    lastTimeRef.current = performance.now();
    lastSpawnRef.current = Date.now();
    maxComboRef.current = 1;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    cancelAnimationFrame(rafRef.current);
  }, []);

  const pause = useCallback(() => {
    isRunningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    if (gameStateRef.current.phase === 'playing') {
      gameStateRef.current = { ...gameStateRef.current, phase: 'paused' };
    }
  }, [gameStateRef]);

  const resume = useCallback(() => {
    if (gameStateRef.current.phase === 'paused') {
      gameStateRef.current = { ...gameStateRef.current, phase: 'playing' };
      isRunningRef.current = true;
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [gameStateRef, tick]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { start, stop, pause, resume };
}

// ── Initial game state factory ────────────────────────────────
export function createInitialGameState(level: number): GameState {
  const config = LEVELS[level - 1] ?? LEVELS[0];
  return {
    phase: 'playing',
    level,
    score: 0,
    highScore: parseInt(localStorage.getItem('skyvector_highscore') ?? '0', 10),
    lives: 3,
    aircraft: [],
    runways: config.runways.map((r) => ({ ...r, isOpen: true, closedUntil: 0 })),
    combo: { count: 0, multiplier: 1, lastLandingTime: 0, timeoutMs: 5000 },
    activeEvent: null,
    nextEventTime: Date.now() + 90_000,
    radarAngle: 0,
    windDirection: config.windDirection,
    windStrength: config.windStrength,
    sessionStartTime: Date.now(),
    totalLandings: 0,
    collisions: 0,
    selectedAircraftId: null,
    drawingPath: [],
    isDrawing: false,
  };
}
