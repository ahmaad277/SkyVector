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
import SurvivalRoundComplete from './components/SurvivalRoundComplete';
import OnlineMenu from './components/OnlineMenu';
import LobbyScreen from './components/LobbyScreen';
import VersusResultsScreen from './components/VersusResultsScreen';
import MultiplayerHUD from './components/MultiplayerHUD';
import OnboardingOverlay, { hasSeenTutorial } from './components/OnboardingOverlay';
import { useMultiplayer } from './hooks/useMultiplayer';
import { createInitialSurvivalState, getSurvivalLevelConfig, advanceSurvivalRoundAfterPowerUp } from './engine/SurvivalEngine';
import { LEVELS } from './levels';

import { getBackgroundTheme } from './utils/backgroundThemes';

import { createMultiplayerState, type PlayerInput, type MatchEndResult, canControlAircraft } from './engine/MultiplayerEngine';

import ToastContainer, { showToast } from './components/shared/Toast';
import { pickNextMission } from './utils/missionUtils';

type AppScreen = 'menu' | 'stage_select' | 'game' | 'gameover' | 'leaderboard' | 'levelcomplete' | 'survival_menu' | 'online_menu' | 'lobby' | 'match_results';

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

  const [, setActiveMissionId] = useState<string | null>(null);
  const [survivalPowerUpOpen, setSurvivalPowerUpOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchEndResult | null>(null);
  const [multiplayerHud, setMultiplayerHud] = useState<import('./engine/MultiplayerEngine').MultiplayerState | undefined>(undefined);
  const [isCoopWin, setIsCoopWin] = useState(false);
  const [isTeamFailure, setIsTeamFailure] = useState(false);
  const renderFrameCbRef = useRef<(state: GameState, canvas: HTMLCanvasElement) => void>(() => {});
  const sessionFuelLossRef = useRef(false);
  const lastComboMissionTierRef = useRef(0);

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
  const authUserId = multiplayer.authUserId ?? profile.id;

  const handleGoOnline = useCallback(() => {
    setScreen('online_menu');
    void multiplayer.prepareAuth();
  }, [multiplayer]);

  useEffect(() => {
    if (screen === 'menu' && !hasSeenTutorial()) {
      setShowOnboarding(true);
    }
  }, [screen]);

  const resetSessionMissionRefs = useCallback(() => {
    sessionFuelLossRef.current = false;
    lastComboMissionTierRef.current = 0;
    setSurvivalPowerUpOpen(false);
    setMatchResult(null);
    setMultiplayerHud(undefined);
    setIsCoopWin(false);
    setIsTeamFailure(false);
  }, []);

  const denyControl = useCallback(() => {
    showToast('NOT YOUR AIRCRAFT', 'warning');
  }, []);

  const handleBackToLobby = useCallback(async () => {
    if (multiplayer.room && gameStateRef.current.multiplayerState?.isHost) {
      await multiplayer.resetRoomForRematch();
    }
    multiplayer.closeGameChannel();
    gameLoopRef.current?.stop();
    setMatchResult(null);
    setIsCoopWin(false);
    setIsTeamFailure(false);
    setScreen('lobby');
  }, [multiplayer]);

  const canControlLocal = useCallback(
    (aircraftId: string) => {
      const mp = gameStateRef.current.multiplayerState;
      if (!mp) return true;
      return canControlAircraft(mp, authUserId, aircraftId, gameStateRef.current);
    },
    [authUserId]
  );

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

      if (state.multiplayerState) {
        setMultiplayerHud(state.multiplayerState);
      }

      // Multiplayer broadcast
      if (state.multiplayerState && state.multiplayerState.isHost && multiplayer.gameChannel) {
        const now = Date.now();
        if (now - state.multiplayerState.lastBroadcast > 100) {
          state.multiplayerState.lastBroadcast = now;
          multiplayer.gameChannel.send({
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
              runways: state.runways,
              windDirection: state.windDirection,
              windStrength: state.windStrength,
              multiplayerState: {
                playerScores: state.multiplayerState.playerScores,
                playerLandings: state.multiplayerState.playerLandings,
                playerLives: state.multiplayerState.playerLives,
                matchEnded: state.multiplayerState.matchEnded,
                winnerId: state.multiplayerState.winnerId,
                matchStartedAt: state.multiplayerState.matchStartedAt,
              },
            }
          });
        }
      }
    },
    [multiplayer.gameChannel]
  );

  renderFrameCbRef.current = renderFrameCb;

  // ── Game loop callbacks ───────────────────────────────────
  const handleScoreUpdate = useCallback((s: number) => setScore(s), []);
  const handleComboUpdate = useCallback((c: GameState['combo']) => {
    setCombo(c);
    const tier = c.multiplier >= 5 ? 5 : c.multiplier >= 3 ? 3 : 0;
    if (tier > lastComboMissionTierRef.current) {
      progressMission('combo_streak', tier - lastComboMissionTierRef.current);
      lastComboMissionTierRef.current = tier;
    }
  }, [progressMission]);

  const handleSurvivalRoundComplete = useCallback(() => {
    setSurvivalPowerUpOpen(true);
    setIsPaused(true);
  }, []);

  const handleSurvivalPowerUpSelect = useCallback(
    (powerUp: import('./types/survival.types').PowerUp) => {
      const now = Date.now();
      const surv = gameStateRef.current.survivalState;
      if (!surv) return;

      const updatedSurv = advanceSurvivalRoundAfterPowerUp(surv, powerUp, now);
      const nextRound = updatedSurv.round;
      const newConfig = getSurvivalLevelConfig(nextRound);

      gameStateRef.current = {
        ...gameStateRef.current,
        phase: 'playing',
        survivalState: updatedSurv,
        runways: newConfig.runways.map((r) => ({ ...r, isOpen: true, closedUntil: 0 })),
        windDirection: newConfig.windDirection,
        windStrength: newConfig.windStrength,
        activeEvent: {
          type: 'round_start',
          startTime: now,
          duration: 4000,
          payload: { round: nextRound, powerUpName: powerUp.name },
        },
      };
      setActiveEvent(gameStateRef.current.activeEvent);
      setActiveMissionId(pickNextMission(missions));
      setSurvivalPowerUpOpen(false);
      setIsPaused(false);
      gameLoopRef.current?.start();
    },
    [missions]
  );

  const handleMultiplayerMatchEnd = useCallback(
    (result: MatchEndResult) => {
      gameLoopRef.current?.stop();
      setMatchResult(result);

      if (gameStateRef.current.multiplayerState?.isHost) {
        void multiplayer.finishMatch();
        multiplayer.gameChannel?.send({
          type: 'broadcast',
          event: 'match_end',
          payload: result,
        });
      }

      if (result.reason === 'versus_landings' || result.reason === 'versus_time') {
        setScreen('match_results');
        return;
      }

      if (result.reason === 'coop_complete') {
        setIsCoopWin(true);
        setScreen('levelcomplete');
        return;
      }

      setIsTeamFailure(true);
      setGameOverData({
        score: gameStateRef.current.score,
        maxCombo: maxComboRef.current,
        totalLandings: gameStateRef.current.totalLandings,
        level: gameStateRef.current.level,
        reason: 'collision',
        isNewBest: false,
      });
      setScreen('gameover');
    },
    [multiplayer]
  );

  const handleGameOver = useCallback(
    async (finalScore: number, maxCombo: number, reason: 'collision' | 'fuel' | 'vip_delay' | 'survival_health') => {
      const state = gameStateRef.current;
      play('collision');

      if (reason === 'fuel') {
        sessionFuelLossRef.current = true;
      }
      
      if (state.survivalState) {
        const roundReached = state.survivalState.round - 1;
        const prevBestRound = parseInt(localStorage.getItem('skyvector_survival_best_round') ?? '0', 10);
        const prevBestScore = parseInt(localStorage.getItem('skyvector_survival_best_score') ?? '0', 10);
        if (roundReached > prevBestRound) {
          localStorage.setItem('skyvector_survival_best_round', String(roundReached));
        }
        if (state.survivalState.totalScore > prevBestScore) {
          localStorage.setItem('skyvector_survival_best_score', String(state.survivalState.totalScore));
        }
        if (!sessionFuelLossRef.current) {
          progressMission('no_fuel_loss', 1);
        }
        setScreen('gameover');
        return;
      }

      if (state.multiplayerState) {
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
      if (!sessionFuelLossRef.current) {
        progressMission('no_fuel_loss', 1);
      }
      setScreen('gameover');
    },
    [play, highScores, progressMission]
  );

  const gameLoopRef = useRef<ReturnType<typeof useGameLoop> | null>(null);

  const handleLevelComplete = useCallback(
    (level: number) => {
      const state = gameStateRef.current;
      
      if (state.survivalState) {
        setActiveMissionId(pickNextMission(missions));
        return;
      }

      if (state.multiplayerState) {
        return;
      }

      if (!sessionFuelLossRef.current) {
        progressMission('no_fuel_loss', 1);
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
      if (nextLevel > unlockedLevel && nextLevel <= LEVELS.length) {
        setUnlockedLevel(nextLevel);
        localStorage.setItem('skyvector_unlocked', String(nextLevel));
      }
      setScreen('levelcomplete');
    },
    [unlockedLevel, highScores, missions, progressMission]
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
      setActiveMissionId(pickNextMission(missions));

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
    onSurvivalRoundComplete: handleSurvivalRoundComplete,
    onMultiplayerMatchEnd: handleMultiplayerMatchEnd,
    onFuelLoss: () => { sessionFuelLossRef.current = true; },
    onOutOfBounds: () => { showToast('AIRCRAFT LOST — OUT OF BOUNDS', 'warning'); play('collision'); },
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
        } else if (screen === 'stage_select') {
          setScreen('menu');
        } else if (screen === 'survival_menu') {
          setScreen('menu');
        } else if (screen === 'online_menu') {
          setScreen('menu');
        } else if (screen === 'lobby') {
          multiplayer.leaveRoom();
          setScreen('menu');
        } else if (screen === 'leaderboard') {
          setScreen('menu');
        } else if (screen === 'levelcomplete') {
          setScreen('menu');
        } else if (screen === 'match_results') {
          setScreen('menu');
        } else if (screen === 'gameover') {
          setScreen('menu');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, isPaused]);

  // ── Multiplayer sync (dedicated game channel) ───────────
  useEffect(() => {
    if (!multiplayer.gameChannel || !multiplayer.room || screen !== 'game') return;

    const ch = multiplayer.gameChannel;
    const isHost = multiplayer.room.host_id === authUserId;

    const inputHandler = ({ payload }: { payload: unknown }) => {
      if (gameStateRef.current.multiplayerState) {
        gameStateRef.current.multiplayerState.inputQueue.push(payload as PlayerInput);
      }
    };

    const stateHandler = ({ payload }: { payload: Record<string, unknown> }) => {
      const prev = gameStateRef.current;
      const mpPayload = payload.multiplayerState as Record<string, unknown> | undefined;
      const localSelection = prev.selectedAircraftId;
      const localDrawing = prev.isDrawing;
      const localDrawPath = prev.drawingPath;

      gameStateRef.current = {
        ...prev,
        ...(payload as Partial<GameState>),
        selectedAircraftId: localSelection,
        isDrawing: localDrawing,
        drawingPath: localDrawPath,
        multiplayerState: prev.multiplayerState && mpPayload
          ? { ...prev.multiplayerState, ...mpPayload }
          : prev.multiplayerState,
      };
      if (gameCanvasRef.current) {
        renderFrameCbRef.current(gameStateRef.current, gameCanvasRef.current);
      }
    };

    const matchEndHandler = ({ payload }: { payload: MatchEndResult }) => {
      matchEndHandlerRef.current(payload);
    };

    const pauseHandler = ({ payload }: { payload: { paused: boolean } }) => {
      if (payload.paused) {
        gameLoopRef.current?.pause();
        setIsPaused(true);
      } else {
        gameLoopRef.current?.resume();
        setIsPaused(false);
      }
    };

    if (isHost) {
      ch.on('broadcast', { event: 'player_input' }, inputHandler);
    } else {
      ch.on('broadcast', { event: 'game_state' }, stateHandler);
      ch.on('broadcast', { event: 'match_end' }, matchEndHandler);
      ch.on('broadcast', { event: 'pause_state' }, pauseHandler);
    }

    return () => {
      // Channel lifecycle handled by openGameChannel / closeGameChannel on screen change
    };
  }, [multiplayer.gameChannel, multiplayer.room?.id, authUserId, screen]);

  useEffect(() => {
    if (screen !== 'game') {
      multiplayer.closeGameChannel();
    }
  }, [screen, multiplayer]);
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
    resetSessionMissionRefs();
    const survState = createInitialSurvivalState();
    const config = getSurvivalLevelConfig(1);
    
    gameStateRef.current = createInitialGameState(1);
    gameStateRef.current.survivalState = survState;
    gameStateRef.current.runways = config.runways.map((r) => ({ ...r, isOpen: true, closedUntil: 0 }));
    gameStateRef.current.windDirection = config.windDirection;
    gameStateRef.current.windStrength = config.windStrength;
    gameStateRef.current.altitudeEnabled = true;
    
    // Pick a random uncompleted mission for survival
    setActiveMissionId(pickNextMission(missions, { isSurvival: true }));

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
  }, [missions, resetSessionMissionRefs]);

  const handleStartLevel = useCallback(
    (level: number, isMultiplayer = false) => {
      resetSessionMissionRefs();
      gameStateRef.current = createInitialGameState(level);
      
      if (isMultiplayer && multiplayer.room) {
        multiplayer.openGameChannel(multiplayer.room.code);
        gameStateRef.current.multiplayerState = createMultiplayerState(
          multiplayer.room,
          multiplayer.players,
          authUserId
        );
        gameStateRef.current.level = multiplayer.room.level;
        gameStateRef.current.altitudeEnabled = multiplayer.room.level >= 4;
      }
      
      setActiveMissionId(pickNextMission(missions, { level, isSurvival: false }));

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
    [multiplayer, authUserId, missions, resetSessionMissionRefs]
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
    if (gameStateRef.current.multiplayerState?.isHost && multiplayer.gameChannel) {
      multiplayer.gameChannel.send({
        type: 'broadcast',
        event: 'pause_state',
        payload: { paused: true },
      });
    }
  }, [multiplayer.gameChannel]);

  const handleResume = useCallback(() => {
    gameLoopRef.current?.resume();
    setIsPaused(false);
    if (gameStateRef.current.multiplayerState?.isHost && multiplayer.gameChannel) {
      multiplayer.gameChannel.send({
        type: 'broadcast',
        event: 'pause_state',
        payload: { paused: false },
      });
    }
  }, [multiplayer.gameChannel]);

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
    const gc = multiplayer.gameChannel;
    if (multiplayer.room && multiplayer.room.host_id !== authUserId && gc) {
      gc.send({
        type: 'broadcast',
        event: 'player_input',
        payload: { type: 'draw_path', aircraftId, path, playerId: authUserId, seq: Date.now() }
      });
      return;
    }

    if (!canControlLocal(aircraftId)) {
      denyControl();
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
  }, [play, multiplayer, authUserId, canControlLocal, denyControl]);

  const handleAircraftSelected = useCallback((id: string | null) => {
    gameStateRef.current = { ...gameStateRef.current, selectedAircraftId: id };
  }, []);

  const handleHoldingToggle = useCallback((aircraftId: string) => {
    const gc = multiplayer.gameChannel;
    if (multiplayer.room && multiplayer.room.host_id !== authUserId && gc) {
      gc.send({
        type: 'broadcast',
        event: 'player_input',
        payload: { type: 'holding_toggle', aircraftId, playerId: authUserId, seq: Date.now() }
      });
      return;
    }

    if (!canControlLocal(aircraftId)) {
      denyControl();
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
  }, [play, multiplayer, authUserId, canControlLocal, denyControl]);

  const handleAltitudeChange = useCallback((aircraftId: string, altitude: 1 | 2 | 3) => {
    const gc = multiplayer.gameChannel;
    if (multiplayer.room && multiplayer.room.host_id !== authUserId && gc) {
      gc.send({
        type: 'broadcast',
        event: 'player_input',
        payload: { type: 'altitude_change', aircraftId, altitude, playerId: authUserId, seq: Date.now() }
      });
      return;
    }

    if (!canControlLocal(aircraftId)) {
      denyControl();
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
  }, [play, multiplayer, authUserId, canControlLocal, denyControl]);

  const handleRunwaySelect = useCallback((aircraftId: string, runwayId: string | null) => {
    const gc = multiplayer.gameChannel;
    if (multiplayer.room && multiplayer.room.host_id !== authUserId && gc) {
      gc.send({
        type: 'broadcast',
        event: 'player_input',
        payload: { type: 'runway_select', aircraftId, runwayId, playerId: authUserId, seq: Date.now() }
      });
      return;
    }

    if (!canControlLocal(aircraftId)) {
      denyControl();
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
  }, [play, multiplayer, authUserId, canControlLocal, denyControl]);

  const incompleteMissions = missions.filter((m) => !m.completed);
  const matchEndHandlerRef = useRef(handleMultiplayerMatchEnd);
  matchEndHandlerRef.current = handleMultiplayerMatchEnd;

  useEffect(() => {
    if (multiplayer.room && multiplayer.room.status === 'lobby' && screen !== 'lobby') {
      setScreen('lobby');
    } else if (multiplayer.room && multiplayer.room.status === 'playing' && screen === 'lobby') {
      // Start multiplayer game
      handleStartLevel(multiplayer.room.level, true);
    }
  }, [multiplayer.room, screen, handleStartLevel]);

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div style={appStyles.root} className={`theme-${bgTheme}`}>
      <ToastContainer />
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
          {multiplayerHud ? (
            <MultiplayerHUD
              multiplayerState={multiplayerHud}
              totalLandings={totalLandings}
              lives={lives}
              score={score}
            />
          ) : gameStateRef.current.survivalState ? (
            <SurvivalHUD
              survivalState={gameStateRef.current.survivalState}
              missions={incompleteMissions}
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
              missions={incompleteMissions}
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
            canControlAircraft={canControlLocal}
            onControlDenied={denyControl}
            onCanvasReady={(canvas) => { gameCanvasRef.current = canvas; }}
          />
          {isPaused && !survivalPowerUpOpen && (
            <PauseScreen
              onResume={handleResume}
              onMenu={() => { gameLoopRef.current?.stop(); setScreen('menu'); }}
              score={score}
            />
          )}
          {survivalPowerUpOpen && gameStateRef.current.survivalState?.pendingPowerUpChoices && (
            <SurvivalRoundComplete
              round={gameStateRef.current.survivalState.round}
              choices={gameStateRef.current.survivalState.pendingPowerUpChoices}
              onSelect={handleSurvivalPowerUpSelect}
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
          onOnline={handleGoOnline}
          onLeaderboard={() => setScreen('leaderboard')}
          onHowToPlay={() => setShowOnboarding(true)}
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
          highScores={highScores}
        />
      )}

      {/* Game Over */}
      {screen === 'gameover' && (
        gameStateRef.current.survivalState ? (
          <SurvivalGameOver
            state={gameStateRef.current.survivalState}
            maxCombo={maxComboRef.current}
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
            teamFailure={isTeamFailure}
            onRestart={handleRestartFromGameOver}
            onMenu={() => { multiplayer.closeGameChannel(); setScreen('menu'); }}
            onLobby={isTeamFailure ? handleBackToLobby : undefined}
            onSubmitScore={handleSubmitScore}
            submitting={submitting}
          />
        )
      )}

      {/* Level Complete Transition */}
      {screen === 'levelcomplete' && (
        <LevelCompleteScreen
          level={gameStateRef.current.level}
          score={score}
          stats={gameStateRef.current.levelStats}
          isCoopWin={isCoopWin}
          onNextLevel={handleStartNextLevel}
          onMenu={() => { multiplayer.closeGameChannel(); setScreen('menu'); }}
          onLobby={isCoopWin ? handleBackToLobby : undefined}
          onSubmitScore={isCoopWin || gameStateRef.current.level >= LEVELS.length ? handleSubmitScore : undefined}
          submitting={submitting}
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
          multiplayer={multiplayer}
        />
      )}

      {/* Lobby Screen */}
      {screen === 'lobby' && (
        <LobbyScreen
          multiplayer={multiplayer}
          onBack={() => { multiplayer.leaveRoom(); setScreen('menu'); }}
          onStartGame={() => {}}
          currentUserId={authUserId}
        />
      )}

      {/* Versus / match results */}
      {screen === 'match_results' && matchResult && multiplayer.room && (
        <VersusResultsScreen
          result={matchResult}
          players={multiplayer.players}
          currentUserId={authUserId}
          onLobby={handleBackToLobby}
          onMenu={() => { multiplayer.leaveRoom(); setScreen('menu'); }}
        />
      )}

      {/* Leaderboard */}
      {screen === 'leaderboard' && (
        <Leaderboard
          onClose={() => setScreen('menu')}
          currentPlayerScore={Math.max(0, ...Object.values(highScores))}
        />
      )}
      {showOnboarding && (
        <OnboardingOverlay
          onComplete={() => setShowOnboarding(false)}
          onDismiss={() => setShowOnboarding(false)}
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
