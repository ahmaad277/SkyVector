import { useState, useRef, useEffect, useCallback } from 'react';
import type { GameState, Vec2 } from './types/game.types';
import RadarScreen, { renderFrame } from './components/RadarScreen';
import HUD from './components/HUD';
import MainMenu from './components/MainMenu';
import StageSelectScreen from './components/StageSelectScreen';
import GameOverScreen from './components/GameOverScreen';
import PauseScreen from './components/PauseScreen';
import Leaderboard from './components/Leaderboard';
import { useGameLoop, createInitialGameState } from './engine/useGameLoop';
import { useAudio } from './hooks/useAudio';
import { useSupabase } from './hooks/useSupabase';
import { simplifyPath, smoothPath, findClosestForwardProgress } from './utils/pathMath';

type AppScreen = 'menu' | 'stage_select' | 'game' | 'gameover' | 'leaderboard';

export default function App() {
  // ── UI state (React) ─────────────────────────────────────
  const [screen, setScreen] = useState<AppScreen>('menu');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState<GameState['combo']>({
    count: 0, multiplier: 1, lastLandingTime: 0, timeoutMs: 5000,
  });
  const [activeEvent, setActiveEvent] = useState<GameState['activeEvent']>(null);
  const [aircraftCount, setAircraftCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOverData, setGameOverData] = useState({
    score: 0, maxCombo: 1, totalLandings: 0, level: 1, reason: 'collision' as 'collision' | 'fuel' | 'vip_delay'
  });
  const [submitting, setSubmitting] = useState(false);
  const [sessionStart, setSessionStart] = useState(Date.now());
  const [highScore, setHighScore] = useState(() =>
    parseInt(localStorage.getItem('skyvector_highscore') ?? '0', 10)
  );
  const [unlockedLevel, setUnlockedLevel] = useState(() =>
    parseInt(localStorage.getItem('skyvector_unlocked') ?? '1', 10)
  );

  // ── Mutable game state (no re-renders during game loop) ──
  const gameStateRef = useRef<GameState>(createInitialGameState(1));
  const maxComboRef = useRef(1);

  // ── Hooks ────────────────────────────────────────────────
  const { play } = useAudio();
  const { profile, saveGameResult, progressMission } = useSupabase();

  // ── Rendering (called from game loop) ────────────────────
  const renderFrameCb = useCallback(
    (state: GameState, canvas: HTMLCanvasElement) => {
      renderFrame(state, canvas);
      // Sync aircraft count to React state (cheap — once per frame)
      const active = state.aircraft.filter(
        (a) => a.state !== 'landed' && a.state !== 'crashed'
      ).length;
      setAircraftCount(active);
    },
    []
  );

  // ── Game loop callbacks ───────────────────────────────────
  const handleScoreUpdate = useCallback((s: number) => setScore(s), []);
  const handleComboUpdate = useCallback((c: GameState['combo']) => setCombo(c), []);

  const handleGameOver = useCallback(
    async (finalScore: number, maxCombo: number, reason: 'collision' | 'fuel' | 'vip_delay') => {
      const state = gameStateRef.current;
      play('collision');
      const isNewBest = finalScore > highScore;
      if (isNewBest) setHighScore(finalScore);
      setGameOverData({
        score: finalScore,
        maxCombo,
        totalLandings: state.totalLandings,
        level: state.level,
        reason,
      });
      maxComboRef.current = maxCombo;
      setScreen('gameover');
    },
    [play, highScore]
  );

  const gameLoopRef = useRef<ReturnType<typeof useGameLoop> | null>(null);

  const handleLevelComplete = useCallback(
    (level: number) => {
      const nextLevel = level + 1;
      if (nextLevel > unlockedLevel) {
        setUnlockedLevel(nextLevel);
        localStorage.setItem('skyvector_unlocked', String(nextLevel));
      }
      if (nextLevel <= 8) {
        setTimeout(() => {
          gameStateRef.current = createInitialGameState(nextLevel);
          gameLoopRef.current?.start();
        }, 1500);
      }
    },
    [unlockedLevel]
  );

  const handleEventTriggered = useCallback(
    (event: GameState['activeEvent']) => {
      setActiveEvent(event);
      if (event) play('event_alert');
    },
    [play]
  );

  const handleLanding = useCallback(
    (_callsign: string, isVIP: boolean, isEmergency: boolean) => {
      if (isVIP) {
        play('landing_vip');
        progressMission('vip_land', 1);
      } else if (isEmergency) {
        play('landing_emergency');
        progressMission('emergency', 1);
      } else {
        play('landing');
      }
      progressMission('land_count', 1);

      // Combo sound
      if (combo.count >= 2) play('combo');

      // HUD flash
      (HUD as any)._triggerFlash?.();
    },
    [play, progressMission, combo.count]
  );

  // ── Game loop ─────────────────────────────────────────────
  const gameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameLoop = useGameLoop({
    gameStateRef,
    canvasRef: gameCanvasRef,
    onScoreUpdate: handleScoreUpdate,
    onComboUpdate: handleComboUpdate,
    onGameOver: handleGameOver,
    onLevelComplete: handleLevelComplete,
    onEventTriggered: handleEventTriggered,
    onLanding: handleLanding,
    renderFrame: renderFrameCb,
  });

  // Keep ref in sync
  gameLoopRef.current = gameLoop;

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (screen === 'game') {
          if (isPaused) handleResume();
          else handlePause();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, isPaused]);

  // ── Radar ping every ~3s ──────────────────────────────────
  useEffect(() => {
    if (screen !== 'game' || isPaused) return;
    const id = setInterval(() => play('radar_ping'), 3200);
    return () => clearInterval(id);
  }, [screen, isPaused, play]);

  // ── Fuel warning sound (low-fuel aircraft) ────────────────
  useEffect(() => {
    if (screen !== 'game' || isPaused) return;
    const id = setInterval(() => {
      const hasLowFuel = gameStateRef.current.aircraft.some(
        (a) => a.fuel <= 20 && a.state !== 'landed' && a.state !== 'crashed'
      );
      if (hasLowFuel) play('fuel_warning');
    }, 2000);
    return () => clearInterval(id);
  }, [screen, isPaused, play]);

  // ── Actions ───────────────────────────────────────────────
  const handleStartLevel = useCallback(
    (level: number) => {
      gameStateRef.current = createInitialGameState(level);
      maxComboRef.current = 1;
      setScore(0);
      setCombo({ count: 0, multiplier: 1, lastLandingTime: 0, timeoutMs: 5000 });
      setActiveEvent(null);
      setIsPaused(false);
      setSessionStart(Date.now());
      localStorage.setItem('skyvector_last_level', String(level));
      setScreen('game');
      setTimeout(() => gameLoopRef.current?.start(), 50);
    },
    []
  );

  const handleContinue = useCallback(() => {
    const lastLevel = parseInt(localStorage.getItem('skyvector_last_level') ?? '1', 10);
    handleStartLevel(lastLevel);
  }, [handleStartLevel]);

  const handleGoToStageSelect = useCallback(() => {
    setScreen('stage_select');
  }, []);

  const handleUnlockAllStages = useCallback(() => {
    setUnlockedLevel(8);
    localStorage.setItem('skyvector_unlocked', '8');
  }, []);

  const handlePause = useCallback(() => {
    gameLoopRef.current?.pause();
    setIsPaused(true);
  }, []);

  const handleResume = useCallback(() => {
    gameLoopRef.current?.resume();
    setIsPaused(false);
  }, []);

  const handleRestartFromGameOver = useCallback(() => {
    const lastLevel = gameOverData.level;
    handleStartLevel(lastLevel);
  }, [handleStartLevel, gameOverData.level]);

  const handleSubmitScore = useCallback(async () => {
    setSubmitting(true);
    const duration = Math.floor((Date.now() - sessionStart) / 1000);
    await saveGameResult({
      score: gameOverData.score,
      levelReached: gameOverData.level,
      comboMax: gameOverData.maxCombo,
      durationSeconds: duration,
      totalLandings: gameOverData.totalLandings,
    });
    setSubmitting(false);
  }, [gameOverData, sessionStart, saveGameResult]);

  // ── Path drawn callback (from RadarScreen) ────────────────
  const handlePathDrawn = useCallback((aircraftId: string, path: Vec2[]) => {
    gameStateRef.current = {
      ...gameStateRef.current,
      aircraft: gameStateRef.current.aircraft.map((a) => {
        if (a.id !== aircraftId) return a;
        // Build path from raw drawn points. If the aircraft moved away while
        // the user was drawing, bridge from its current position to avoid a
        // large cross-track correction on the first simulation frame.
        const drawnPath = smoothPath(simplifyPath(path, 8));
        // Find the closest forward point on the new path so the aircraft
        // merges onto it without reversing direction
        const startProgress = drawnPath.length >= 2
          ? findClosestForwardProgress(drawnPath, a.position, a.heading)
          : 0;
        return {
          ...a,
          path: drawnPath,
          pathProgress: startProgress,
          state: a.state === 'holding' ? 'flying' : a.state,
        };
      }),
      drawingPath: [],
      isDrawing: false,
    };
    play('draw_path');
  }, [play]);

  const handleAircraftSelected = useCallback((id: string | null) => {
    gameStateRef.current = { ...gameStateRef.current, selectedAircraftId: id };
  }, []);

  const handleHoldingToggle = useCallback((aircraftId: string) => {
    gameStateRef.current = {
      ...gameStateRef.current,
      aircraft: gameStateRef.current.aircraft.map((a) => {
        if (a.id !== aircraftId) return a;
        if (a.state === 'holding') {
          return { ...a, state: 'flying', holdingCenter: null };
        }
        return { ...a, state: 'holding', holdingCenter: { ...a.position } };
      }),
    };
    play('holding_toggle');
  }, [play]);

  // ── Canvas ref bridge ─────────────────────────────────────
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={appStyles.root}>
      {/* Game canvas — always mounted so ref stays valid */}
      <div
        ref={canvasContainerRef}
        style={{
          ...appStyles.canvasWrapper,
          display: screen === 'game' ? 'flex' : 'none',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          <HUD
            score={score}
            highScore={highScore}
            combo={combo}
            level={gameStateRef.current.level}
            totalLandings={gameStateRef.current.totalLandings}
            totalXP={profile.totalXP}
            activeEvent={activeEvent}
            aircraftCount={aircraftCount}
            onPause={handlePause}
          />
        </div>
        <div style={{ ...appStyles.radarWrapper, width: '100%', height: '100%' }}>
          <RadarScreen
            gameStateRef={gameStateRef}
            onPathDrawn={handlePathDrawn}
            onAircraftSelected={handleAircraftSelected}
            onHoldingToggle={handleHoldingToggle}
            onCanvasReady={(canvas) => { gameCanvasRef.current = canvas; }}
          />
          {isPaused && (
            <PauseScreen
              onResume={handleResume}
              onMenu={() => { gameLoopRef.current?.stop(); setScreen('menu'); }}
              score={score}
            />
          )}
        </div>
      </div>

      {/* Main Menu */}
      {screen === 'menu' && (
        <MainMenu
          onContinue={handleContinue}
          onNewGame={handleGoToStageSelect}
          onLeaderboard={() => setScreen('leaderboard')}
          onUnlockAllStages={handleUnlockAllStages}
          highScore={highScore}
          canContinue={!!localStorage.getItem('skyvector_last_level')}
        />
      )}

      {/* Stage Selection */}
      {screen === 'stage_select' && (
        <StageSelectScreen
          onStartLevel={handleStartLevel}
          onBack={() => setScreen('menu')}
          unlockedLevel={unlockedLevel}
        />
      )}

      {/* Game Over */}
      {screen === 'gameover' && (
        <GameOverScreen
          score={gameOverData.score}
          highScore={highScore}
          maxCombo={gameOverData.maxCombo}
          totalLandings={gameOverData.totalLandings}
          level={gameOverData.level}
          reason={gameOverData.reason}
          isNewHighScore={gameOverData.score >= highScore && gameOverData.score > 0}
          onRestart={handleRestartFromGameOver}
          onMenu={() => setScreen('menu')}
          onSubmitScore={handleSubmitScore}
          submitting={submitting}
        />
      )}

      {/* Leaderboard */}
      {screen === 'leaderboard' && (
        <Leaderboard
          onClose={() => setScreen('menu')}
          currentPlayerScore={highScore}
        />
      )}
    </div>
  );
}

const appStyles: Record<string, React.CSSProperties> = {
  root: {
    position: 'relative',
    width: '100vw',
    height: '100dvh',
    overflow: 'hidden',
    background: '#0B132B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
    paddingLeft: 'env(safe-area-inset-left)',
    paddingRight: 'env(safe-area-inset-right)',
  },
  canvasWrapper: {
    width: '100%',
    height: '100%',
    maxWidth: 900,
  },
  radarWrapper: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    overflow: 'hidden',
  },
};
