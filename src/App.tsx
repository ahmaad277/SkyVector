import { useState, useRef, useEffect, useCallback } from 'react';
import type { GameState, Vec2 } from './types/game.types';
import RadarScreen, { renderFrame } from './components/RadarScreen';
import HUD from './components/HUD';
import MainMenu from './components/MainMenu';
import StageSelectScreen from './components/StageSelectScreen';
import GameOverScreen from './components/GameOverScreen';
import PauseScreen from './components/PauseScreen';
import Leaderboard from './components/Leaderboard';
import LevelCompleteScreen from './components/LevelCompleteScreen';
import { useGameLoop, createInitialGameState } from './engine/useGameLoop';
import { useAudio } from './hooks/useAudio';
import { useSupabase } from './hooks/useSupabase';
import { simplifyPath, smoothPath, findClosestForwardProgress } from './utils/pathMath';

import SurvivalModeScreen from './components/SurvivalModeScreen';
import SurvivalHUD from './components/SurvivalHUD';
import SurvivalGameOver from './components/SurvivalGameOver';
import OnlineMenu from './components/OnlineMenu';
import LobbyScreen from './components/LobbyScreen';
import { useMultiplayer } from './hooks/useMultiplayer';
import { createInitialSurvivalState, getSurvivalLevelConfig } from './engine/SurvivalEngine';
import { LEVELS } from './levels';

import { getBackgroundTheme } from './utils/backgroundThemes';

import { createMultiplayerState, type PlayerInput } from './engine/MultiplayerEngine';

type AppScreen = 'menu' | 'stage_select' | 'game' | 'gameover' | 'leaderboard' | 'levelcomplete' | 'survival_menu' | 'online_menu' | 'lobby';

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
    score: 0, maxCombo: 1, totalLandings: 0, level: 1, reason: 'collision' as 'collision' | 'fuel' | 'vip_delay', isNewBest: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [sessionStart, setSessionStart] = useState(Date.now());
  const [unlockedLevel, setUnlockedLevel] = useState(() =>
    parseInt(localStorage.getItem('skyvector_unlocked') ?? '1', 10) || 1
  );

  const [bgTheme, setBgTheme] = useState(getBackgroundTheme());

  useEffect(() => {
    const handleSettingsChanged = () => setBgTheme(getBackgroundTheme());
    window.addEventListener('settings_changed', handleSettingsChanged);
    return () => window.removeEventListener('settings_changed', handleSettingsChanged);
  }, []);

  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);

  // ── Mutable game state (no re-renders during game loop) ──
  const gameStateRef = useRef<GameState>(createInitialGameState(1));
  const maxComboRef = useRef(1);

  const [highScores, setHighScores] = useState<Record<number, number>>(() => {
    const saved = localStorage.getItem('skyvector_highscores');
    if (saved) return JSON.parse(saved);
    // Fallback to old global highscore for level 1
    const old = parseInt(localStorage.getItem('skyvector_highscore') ?? '0', 10);
    return { 1: old };
  });

  const [currentLevel, setCurrentLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [totalLandings, setTotalLandings] = useState(0);
  const highScore = highScores[currentLevel] || 0;

  // ── Hooks ────────────────────────────────────────────────
  const { play } = useAudio();
  const { profile, missions, saveGameResult, progressMission } = useSupabase();
  const multiplayer = useMultiplayer();

  // ── Rendering (called from game loop) ────────────────────
  const renderFrameCb = useCallback(
    (state: GameState, canvas: HTMLCanvasElement) => {
      // If we are a guest in multiplayer, we don't run the full game loop tick,
      // but we still need to render. Wait, if we don't run the tick, renderFrameCb isn't called by useGameLoop.
      // Actually, guests will receive state updates and we should render them.
      renderFrame(state, canvas);
      
      // Sync aircraft count to React state (cheap — once per frame)
      const active = state.aircraft.filter(
        (a) => a.state !== 'landed' && a.state !== 'crashed'
      ).length;
      setAircraftCount(active);
      setCurrentLevel(state.level);
      setLives(state.lives);
      setTotalLandings(state.totalLandings);

      // Multiplayer broadcast
      if (state.multiplayerState && state.multiplayerState.isHost && multiplayer.channel) {
        const now = Date.now();
        if (now - state.multiplayerState.lastBroadcast > 100) {
          state.multiplayerState.lastBroadcast = now;
          multiplayer.channel.send({
            type: 'broadcast',
            event: 'game_state',
            payload: {
              aircraft: state.aircraft,
              score: state.score,
              lives: state.lives,
              phase: state.phase,
              activeEvent: state.activeEvent,
              totalLandings: state.totalLandings,
              combo: state.combo,
              radarAngle: state.radarAngle,
            }
          });
        }
      }
    },
    [multiplayer.channel]
  );

  // ── Game loop callbacks ───────────────────────────────────
  const handleScoreUpdate = useCallback((s: number) => setScore(s), []);
  const handleComboUpdate = useCallback((c: GameState['combo']) => setCombo(c), []);

  const handleGameOver = useCallback(
    async (finalScore: number, maxCombo: number, reason: 'collision' | 'fuel' | 'vip_delay' | 'survival_health') => {
      const state = gameStateRef.current;
      play('collision');
      
      if (state.survivalState) {
        setScreen('gameover');
        return;
      }

      const currentLevel = state.level;
      const currentHighScore = highScores[currentLevel] || 0;
      const isNewBest = finalScore > currentHighScore;
      
      if (isNewBest) {
        setHighScores(prev => {
          const next = { ...prev, [currentLevel]: finalScore };
          localStorage.setItem('skyvector_highscores', JSON.stringify(next));
          return next;
        });
      }
      
      setGameOverData({
        score: finalScore,
        maxCombo,
        totalLandings: state.totalLandings,
        level: state.level,
        reason: reason as 'collision' | 'fuel' | 'vip_delay',
        isNewBest,
      });
      maxComboRef.current = maxCombo;
      setScreen('gameover');
    },
    [play, highScores]
  );

  const gameLoopRef = useRef<ReturnType<typeof useGameLoop> | null>(null);

  const handleLevelComplete = useCallback(
    (level: number) => {
      const state = gameStateRef.current;
      
      if (state.survivalState) {
        // In survival, this is just a round transition. Pick a new mission and continue.
        const uncompletedMissions = missions.filter(m => !m.completed);
        if (uncompletedMissions.length > 0) {
          const randomMission = uncompletedMissions[Math.floor(Math.random() * uncompletedMissions.length)];
          setActiveMissionId(randomMission.id);
        } else {
          setActiveMissionId(null);
        }
        return;
      }

      const currentHighScore = highScores[level] || 0;
      if (state.score > currentHighScore) {
        setHighScores(prev => {
          const next = { ...prev, [level]: state.score };
          localStorage.setItem('skyvector_highscores', JSON.stringify(next));
          return next;
        });
      }

      const nextLevel = level + 1;
      if (nextLevel > unlockedLevel) {
        setUnlockedLevel(nextLevel);
        localStorage.setItem('skyvector_unlocked', String(nextLevel));
      }
      setScreen('levelcomplete');
    },
    [unlockedLevel, highScores, missions]
  );

  const handleStartNextLevel = useCallback(() => {
    const nextLevel = gameStateRef.current.level + 1;
    if (nextLevel <= LEVELS.length) {
      const carriedScore = gameStateRef.current.score;
      setCombo({ count: 0, multiplier: 1, lastLandingTime: 0, timeoutMs: 5000 });
      setActiveEvent(null);
      setGameOverData(prev => ({ ...prev, level: nextLevel }));
      gameStateRef.current = createInitialGameState(nextLevel);
      gameStateRef.current.score = carriedScore;
      
      // Pick a random uncompleted mission for this new level
      const uncompletedMissions = missions.filter(m => !m.completed);
      if (uncompletedMissions.length > 0) {
        const randomMission = uncompletedMissions[Math.floor(Math.random() * uncompletedMissions.length)];
        setActiveMissionId(randomMission.id);
      } else {
        setActiveMissionId(null);
      }

      setScore(carriedScore);
      setCurrentLevel(nextLevel);
      setLives(3);
      setTotalLandings(0);
      localStorage.setItem('skyvector_last_level', String(nextLevel));
      setSessionStart(Date.now());
      setScreen('game');
      gameLoopRef.current?.start();
    } else {
      setScreen('menu');
    }
  }, [missions]);

  const handleEventTriggered = useCallback(
    (event: GameState['activeEvent']) => {
      setActiveEvent(event);
      if (event) play('event_alert');
    },
    [play]
  );

  const handleLanding = useCallback(
    (_callsign: string, isNORDO: boolean, isEmergency: boolean) => {
      if (isNORDO) {
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

  // ── Multiplayer sync ──────────────────────────────────────
  useEffect(() => {
    if (!multiplayer.channel || !multiplayer.room || screen !== 'game') return;

    const isHost = multiplayer.room.host_id === profile.id;

    if (isHost) {
      // Host receives inputs
      multiplayer.channel.on('broadcast', { event: 'player_input' }, ({ payload }) => {
        if (gameStateRef.current.multiplayerState) {
          gameStateRef.current.multiplayerState.inputQueue.push(payload as PlayerInput);
        }
      });
    } else {
      // Guest receives state
      multiplayer.channel.on('broadcast', { event: 'game_state' }, ({ payload }) => {
        gameStateRef.current = {
          ...gameStateRef.current,
          ...payload,
        };
        if (gameCanvasRef.current) {
          renderFrameCb(gameStateRef.current, gameCanvasRef.current);
        }
      });
    }

    return () => {
      multiplayer.channel?.unsubscribe();
    };
  }, [multiplayer.channel, multiplayer.room, profile.id, screen, renderFrameCb]);
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
  const handleStartSurvival = useCallback(() => {
    const survState = createInitialSurvivalState();
    const config = getSurvivalLevelConfig(1);
    
    gameStateRef.current = createInitialGameState(1);
    gameStateRef.current.survivalState = survState;
    gameStateRef.current.runways = config.runways.map((r) => ({ ...r, isOpen: true, closedUntil: 0 }));
    gameStateRef.current.windDirection = config.windDirection;
    gameStateRef.current.windStrength = config.windStrength;
    gameStateRef.current.altitudeEnabled = true;
    
    // Pick a random uncompleted mission for survival
    const uncompletedMissions = missions.filter(m => !m.completed);
    if (uncompletedMissions.length > 0) {
      const randomMission = uncompletedMissions[Math.floor(Math.random() * uncompletedMissions.length)];
      setActiveMissionId(randomMission.id);
    } else {
      setActiveMissionId(null);
    }

    maxComboRef.current = 1;
    setScore(0);
    setCurrentLevel(1);
    setLives(3);
    setTotalLandings(0);
    setCombo({ count: 0, multiplier: 1, lastLandingTime: 0, timeoutMs: 5000 });
    setActiveEvent(null);
    setIsPaused(false);
    setSessionStart(Date.now());
    setScreen('game');
    setTimeout(() => gameLoopRef.current?.start(), 50);
  }, [missions]);

  const handleStartLevel = useCallback(
    (level: number, isMultiplayer = false) => {
      gameStateRef.current = createInitialGameState(level);
      
      if (isMultiplayer && multiplayer.room) {
        gameStateRef.current.multiplayerState = createMultiplayerState(
          multiplayer.room,
          multiplayer.players,
          profile.id
        );
        gameStateRef.current.altitudeEnabled = true;
      }
      
      // Pick a random uncompleted mission for this level
      const uncompletedMissions = missions.filter(m => !m.completed);
      if (uncompletedMissions.length > 0) {
        const randomMission = uncompletedMissions[Math.floor(Math.random() * uncompletedMissions.length)];
        setActiveMissionId(randomMission.id);
      } else {
        setActiveMissionId(null);
      }

      maxComboRef.current = 1;
      setScore(0);
      setCurrentLevel(level);
      setLives(3);
      setTotalLandings(0);
      setCombo({ count: 0, multiplier: 1, lastLandingTime: 0, timeoutMs: 5000 });
      setActiveEvent(null);
      setIsPaused(false);
      setSessionStart(Date.now());
      localStorage.setItem('skyvector_last_level', String(level));
      setScreen('game');
      setTimeout(() => gameLoopRef.current?.start(), 50);
    },
    [multiplayer, profile.id, missions]
  );

  const handleContinue = useCallback(() => {
    const lastLevel = parseInt(localStorage.getItem('skyvector_last_level') ?? '1', 10);
    handleStartLevel(lastLevel);
  }, [handleStartLevel]);

  const handleGoToStageSelect = useCallback(() => {
    setScreen('stage_select');
  }, []);

  const handleUnlockAllStages = useCallback(() => {
    setUnlockedLevel(LEVELS.length);
    localStorage.setItem('skyvector_unlocked', String(LEVELS.length));
  }, []);

  const handleLockAllStages = useCallback(() => {
    setUnlockedLevel(1);
    localStorage.setItem('skyvector_unlocked', '1');
  }, []);

  const handleResetProgress = useCallback(() => {
    localStorage.clear();
    setUnlockedLevel(1);
    setHighScores({ 1: 0 });
    setScore(0);
    setCurrentLevel(1);
    setLives(3);
    setTotalLandings(0);
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
    
    // Check if we are submitting a survival score or normal score
    if (gameStateRef.current.survivalState) {
      await saveGameResult({
        score: gameStateRef.current.survivalState.totalScore,
        levelReached: gameStateRef.current.survivalState.round,
        comboMax: maxComboRef.current,
        durationSeconds: duration,
        totalLandings: gameStateRef.current.survivalState.totalLandings,
      });
    } else {
      await saveGameResult({
        score: gameOverData.score,
        levelReached: gameOverData.level,
        comboMax: gameOverData.maxCombo,
        durationSeconds: duration,
        totalLandings: gameOverData.totalLandings,
      });
    }
    
    setSubmitting(false);
  }, [gameOverData, sessionStart, saveGameResult]);

  // ── Path drawn callback (from RadarScreen) ────────────────
  const handlePathDrawn = useCallback((aircraftId: string, path: Vec2[]) => {
    if (multiplayer.room && multiplayer.room.host_id !== profile.id && multiplayer.channel) {
      multiplayer.channel.send({
        type: 'broadcast',
        event: 'player_input',
        payload: { type: 'draw_path', aircraftId, path, playerId: profile.id, seq: Date.now() }
      });
      return;
    }

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
  }, [play, multiplayer, profile.id]);

  const handleAircraftSelected = useCallback((id: string | null) => {
    gameStateRef.current = { ...gameStateRef.current, selectedAircraftId: id };
  }, []);

  const handleHoldingToggle = useCallback((aircraftId: string) => {
    if (multiplayer.room && multiplayer.room.host_id !== profile.id && multiplayer.channel) {
      multiplayer.channel.send({
        type: 'broadcast',
        event: 'player_input',
        payload: { type: 'holding_toggle', aircraftId, playerId: profile.id, seq: Date.now() }
      });
      return;
    }

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
  }, [play, multiplayer, profile.id]);

  const handleAltitudeChange = useCallback((aircraftId: string, altitude: 1 | 2 | 3) => {
    if (multiplayer.room && multiplayer.room.host_id !== profile.id && multiplayer.channel) {
      multiplayer.channel.send({
        type: 'broadcast',
        event: 'player_input',
        payload: { type: 'altitude_change', aircraftId, altitude, playerId: profile.id, seq: Date.now() }
      });
      return;
    }

    gameStateRef.current = {
      ...gameStateRef.current,
      aircraft: gameStateRef.current.aircraft.map((a) => {
        if (a.id !== aircraftId) return a;
        return { ...a, targetAltitude: altitude };
      }),
    };
    play('holding_toggle'); // Using holding_toggle as a generic UI click sound for now
  }, [play, multiplayer, profile.id]);

  const handleRunwaySelect = useCallback((aircraftId: string, runwayId: string | null) => {
    if (multiplayer.room && multiplayer.room.host_id !== profile.id && multiplayer.channel) {
      multiplayer.channel.send({
        type: 'broadcast',
        event: 'player_input',
        payload: { type: 'runway_select', aircraftId, runwayId, playerId: profile.id, seq: Date.now() }
      });
      return;
    }

    gameStateRef.current = {
      ...gameStateRef.current,
      aircraft: gameStateRef.current.aircraft.map((a) => {
        if (a.id !== aircraftId) return a;
        return { ...a, targetRunwayId: runwayId };
      }),
    };
    play('holding_toggle');
  }, [play, multiplayer, profile.id]);

  // ── Canvas ref bridge ─────────────────────────────────────
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (multiplayer.room && multiplayer.room.status === 'lobby' && screen !== 'lobby') {
      setScreen('lobby');
    } else if (multiplayer.room && multiplayer.room.status === 'playing' && screen === 'lobby') {
      // Start multiplayer game
      handleStartLevel(multiplayer.room.level, true);
    }
  }, [multiplayer.room, screen, handleStartLevel]);

  const activeMission = missions.find(m => m.id === activeMissionId);

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={appStyles.root} className={`theme-${bgTheme}`}>
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
        {/* Top HUD */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          {gameStateRef.current.survivalState ? (
            <SurvivalHUD
              survivalState={gameStateRef.current.survivalState}
              missions={activeMission ? [activeMission] : []}
              activeEvent={activeEvent}
              onPause={handlePause}
            />
          ) : (
            <HUD
              score={score}
              highScore={highScore}
              combo={combo}
              level={currentLevel}
              totalLandings={totalLandings}
              totalXP={profile.totalXP}
              activeEvent={activeEvent}
              aircraftCount={aircraftCount}
              lives={lives}
              missions={activeMission ? [activeMission] : []}
              onPause={handlePause}
            />
          )}
        </div>

        <div style={{ ...appStyles.radarWrapper, width: '100%', height: '100%' }}>
          <RadarScreen
            gameStateRef={gameStateRef}
            onPathDrawn={handlePathDrawn}
            onAircraftSelected={handleAircraftSelected}
            onHoldingToggle={handleHoldingToggle}
            onAltitudeChange={handleAltitudeChange}
            onRunwaySelect={handleRunwaySelect}
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
          onSurvival={() => setScreen('survival_menu')}
          onOnline={() => setScreen('online_menu')}
          onLeaderboard={() => setScreen('leaderboard')}
          onUnlockAllStages={handleUnlockAllStages}
          onLockAllStages={handleLockAllStages}
          onResetProgress={handleResetProgress}
          highScore={Math.max(0, ...Object.values(highScores))}
          canContinue={!!localStorage.getItem('skyvector_last_level')}
          unlockedLevel={unlockedLevel}
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
        gameStateRef.current.survivalState ? (
          <SurvivalGameOver
            state={gameStateRef.current.survivalState}
            onRetry={handleStartSurvival}
            onMenu={() => setScreen('menu')}
            onSubmitScore={handleSubmitScore}
            submitting={submitting}
          />
        ) : (
          <GameOverScreen
            score={gameOverData.score}
            highScore={highScores[gameOverData.level] || 0}
            maxCombo={gameOverData.maxCombo}
            totalLandings={gameOverData.totalLandings}
            level={gameOverData.level}
            reason={gameOverData.reason}
            isNewHighScore={gameOverData.isNewBest}
            onRestart={handleRestartFromGameOver}
            onMenu={() => setScreen('menu')}
            onSubmitScore={handleSubmitScore}
            submitting={submitting}
          />
        )
      )}

      {/* Level Complete Transition */}
      {screen === 'levelcomplete' && (
        <LevelCompleteScreen
          level={gameStateRef.current.level}
          stats={gameStateRef.current.levelStats}
          onNextLevel={handleStartNextLevel}
          onMenu={() => setScreen('menu')}
        />
      )}

      {/* Survival Menu */}
      {screen === 'survival_menu' && (
        <SurvivalModeScreen
          onStart={handleStartSurvival}
          onBack={() => setScreen('menu')}
        />
      )}

      {/* Online Menu */}
      {screen === 'online_menu' && (
        <OnlineMenu
          onBack={() => setScreen('menu')}
          username={profile.username}
        />
      )}

      {/* Lobby Screen */}
      {screen === 'lobby' && (
        <LobbyScreen
          multiplayer={multiplayer}
          onBack={() => setScreen('menu')}
          onStartGame={() => {}} // handled by useEffect
          currentUserId={profile.id}
        />
      )}

      {/* Leaderboard */}
      {screen === 'leaderboard' && (
        <Leaderboard
          onClose={() => setScreen('menu')}
          currentPlayerScore={Math.max(0, ...Object.values(highScores))}
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
