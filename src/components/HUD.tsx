import React, { useEffect, useState } from 'react';
import type { GameState, GameEvent, DailyMission } from '../types/game.types';
import { COLORS } from '../utils/colorPalette';
import { LEVELS } from '../levels';
import { getLandingTargetForLevel } from '../utils/levelProgress';

import DailyMissionsPanel from './hud/DailyMissionsPanel';
import GameTopBar from './hud/GameTopBar';
import EventTimer, { eventLabel } from './shared/EventTimer';

import { RANK_THRESHOLDS } from '../types/game.types';

function getRankInfo(xp: number): { current: typeof RANK_THRESHOLDS[number]; next: typeof RANK_THRESHOLDS[number]; progress: number } {
  let current = RANK_THRESHOLDS[0];
  let next = RANK_THRESHOLDS[1] ?? RANK_THRESHOLDS[0];
  for (let i = 0; i < RANK_THRESHOLDS.length; i++) {
    if (xp >= RANK_THRESHOLDS[i].minXP) {
      current = RANK_THRESHOLDS[i];
      next = RANK_THRESHOLDS[i + 1] ?? RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];
    }
  }
  const progressVal = next === current ? 1 : Math.min(1, (xp - current.minXP) / (next.minXP - current.minXP));
  return { current, next, progress: progressVal };
}

interface HUDProps {
  score: number;
  highScore: number;
  combo: GameState['combo'];
  level: number;
  totalLandings: number;
  totalXP: number;
  activeEvent: GameEvent | null;
  aircraftCount: number;
  lives: number;
  missions: DailyMission[];
  onPause: () => void;
}

export default function HUD({
  score,
  highScore,
  combo,
  level,
  totalLandings,
  totalXP,
  activeEvent,
  aircraftCount,
  lives,
  missions,
  onPause,
}: HUDProps) {
  const config = LEVELS[level - 1] ?? LEVELS[0];
  const landingTarget = getLandingTargetForLevel(level);
  const { current: rank, progress: rankProgress } = getRankInfo(totalXP);

  const [eventAnim, setEventAnim] = useState(false);

  useEffect(() => {
    if (activeEvent) {
      setEventAnim(true);
      const t = setTimeout(() => setEventAnim(false), 2000);
      return () => clearTimeout(t);
    }
  }, [activeEvent]);

  return (
    <div style={styles.hud}>
      {/* Top Bar */}
      <GameTopBar
        onPause={onPause}
        score={score}
        highScore={highScore}
        combo={combo}
        level={level}
        totalLandings={totalLandings}
        landingTarget={landingTarget}
        airportIcao={config.airport.icao}
        aircraftCount={aircraftCount}
        maxAircraft={config.maxAircraft}
        lives={lives}
      />

      {level >= 2 && (
        <div style={styles.collisionTip}>
          Collisions cost 2 lives — vector carefully
        </div>
      )}

      {/* Event Banner */}
      {activeEvent && (
        <div
          style={{
            ...styles.eventBanner,
            animation: eventAnim ? 'hudEventPulse 0.5s ease' : undefined,
          }}
        >
          <span style={styles.eventText}>
            {eventLabel[activeEvent.type] ? eventLabel[activeEvent.type](activeEvent) : '⚠ ALERT'}
          </span>
          <EventTimer event={activeEvent} />
        </div>
      )}

      {/* Rank Bar (bottom) */}
      <div style={styles.rankBar}>
        <span style={{ color: rank.color, marginRight: 6, fontWeight: 'bold' }}>
          {rank.badge} {rank.rank}
        </span>
        <div style={styles.xpTrack}>
          <div
            style={{
              ...styles.xpFill,
              width: `${rankProgress * 100}%`,
              background: rank.color,
            }}
          />
        </div>
        <span style={{ color: COLORS.HUD_DIM, marginLeft: 6, fontSize: 'clamp(9px, 2.5vw, 12px)' }}>
          {totalXP.toLocaleString()} XP
        </span>
      </div>

      {/* Daily Missions Panel */}
      <DailyMissionsPanel missions={missions} />
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  hud: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '6px 10px',
    background: 'linear-gradient(to bottom, rgba(11,19,43,0.9) 0%, rgba(11,19,43,0) 100%)',
    borderBottom: 'none',
    fontFamily: 'var(--font-mono)',
    userSelect: 'none',
    pointerEvents: 'none', // let clicks pass through the background
  },
  eventBanner: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 10px',
    background: 'rgba(255,0,60,0.12)',
    border: '1px solid rgba(255,0,60,0.4)',
    borderRadius: 4,
  },
  collisionTip: {
    padding: '2px 10px',
    fontSize: 'clamp(9px, 2.5vw, 10px)',
    color: 'rgba(255,215,0,0.75)',
    letterSpacing: 0.5,
  },
  eventText: {
    color: COLORS.HUD_DANGER,
    fontWeight: 'bold',
    fontSize: 'clamp(11px, 3.5vw, 14px)',
    letterSpacing: 1,
  },
  rankBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 'clamp(10px, 3vw, 13px)',
  },
  xpTrack: {
    flex: 1,
    height: 4,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.5s ease',
  },
};
