import React, { useEffect, useState } from 'react';
import type { GameState, GameEvent, PlayerRank, DailyMission } from '../types/game.types';
import { COLORS } from '../utils/colorPalette';
import { LEVELS } from '../levels';
import { getLandingTargetForLevel } from '../utils/levelProgress';

import DailyMissionsPanel from './hud/DailyMissionsPanel';

import GameTopBar from './hud/GameTopBar';

// ── Rank definitions ─────────────────────────────────────────
const RANKS: { rank: PlayerRank; minXP: number; color: string; badge: string }[] = [
  { rank: '2LT',      minXP: 0,       color: '#888',    badge: '⭐' },
  { rank: '1LT',      minXP: 500,     color: '#A0A0A0', badge: '⭐⭐' },
  { rank: 'CAPT',     minXP: 1500,    color: '#B0B0B0', badge: '⭐⭐⭐' },
  { rank: 'MAJ',      minXP: 3000,    color: '#C0C0C0', badge: '👑' },
  { rank: 'LT. COL',  minXP: 6000,    color: '#D0D0D0', badge: '👑⭐' },
  { rank: 'COL',      minXP: 10000,   color: '#E0E0E0', badge: '👑⭐⭐' },
  { rank: 'BRIG GEN', minXP: 15000,   color: '#F0E68C', badge: '👑⭐⭐⭐' },
  { rank: 'MAJ. GEN', minXP: 22000,   color: '#FFD700', badge: '⚔️⭐' },
  { rank: 'LT. GEN',  minXP: 32000,   color: '#FFA500', badge: '⚔️👑' },
  { rank: 'GEN',      minXP: 50000,   color: '#FF8C00', badge: '⚔️👑⭐' },
];

function getRankInfo(xp: number) {
  let current = RANKS[0];
  let next = RANKS[1];
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].minXP) {
      current = RANKS[i];
      next = RANKS[i + 1] ?? RANKS[RANKS.length - 1];
    }
  }
  const progress =
    next === current
      ? 1
      : Math.min(1, (xp - current.minXP) / (next.minXP - current.minXP));
  return { current, next, progress };
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

  const triggerLandingFlash = () => {
    // Flash handled internally or removed
  };

  // Expose flash trigger
  (HUD as any)._triggerFlash = triggerLandingFlash;

  const eventLabel: Record<string, string> = {
    runway_closed: '⛔ RUNWAY CLOSED',
    wind_shear:    '🌀 WIND SHEAR',
    nordo_flight:  '★ NORDO AIRCRAFT INBOUND',
    bird_strike:   '🐦 BIRD STRIKE ZONE',
  };

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

      {/* Event Banner */}
      {activeEvent && (
        <div
          style={{
            ...styles.eventBanner,
            animation: eventAnim ? 'hudEventPulse 0.5s ease' : undefined,
          }}
        >
          <span style={styles.eventText}>
            {eventLabel[activeEvent.type] ?? '⚠ ALERT'}
          </span>
          <EventTimer event={activeEvent} />
        </div>
      )}

      {/* Rank Bar (bottom) */}
      <div style={styles.rankBar}>
        <span style={{ color: rank.color, marginRight: 6, fontSize: 13, fontWeight: 'bold' }}>
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
        <span style={{ color: COLORS.HUD_DIM, marginLeft: 6, fontSize: 12 }}>
          {totalXP.toLocaleString()} XP
        </span>
      </div>

      {/* Daily Missions Panel */}
      <DailyMissionsPanel missions={missions} />
    </div>
  );
}

// ── Event countdown ───────────────────────────────────────────
function EventTimer({ event }: { event: GameEvent }) {
  const [remaining, setRemaining] = useState(event.duration / 1000);
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - event.startTime;
      setRemaining(Math.max(0, (event.duration - elapsed) / 1000));
    }, 200);
    return () => clearInterval(id);
  }, [event]);

  return (
    <span style={{ color: COLORS.HUD_WARNING, marginLeft: 10, fontSize: 11 }}>
      {remaining.toFixed(0)}s
    </span>
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
  eventText: {
    color: COLORS.HUD_DANGER,
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  rankBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 13,
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
