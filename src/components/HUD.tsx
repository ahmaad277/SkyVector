import React, { useEffect, useState } from 'react';
import type { GameState, GameEvent, PlayerRank } from '../types/game.types';
import { COLORS, getComboColor } from '../utils/colorPalette';
import { LEVELS } from '../levels';
import { getLandingTargetForLevel } from '../utils/levelProgress';

// ── Rank definitions ─────────────────────────────────────────
const RANKS: { rank: PlayerRank; minXP: number; color: string; badge: string }[] = [
  { rank: 'Student Pilot',    minXP: 0,     color: '#888',    badge: '🎓' },
  { rank: 'Private Pilot',    minXP: 500,   color: '#00FF41', badge: '✈' },
  { rank: 'CPL',              minXP: 2000,  color: '#00B4D8', badge: '🛩' },
  { rank: 'ATPL',             minXP: 6000,  color: '#FFA500', badge: '⭐' },
  { rank: 'Senior Controller',minXP: 15000, color: '#FF003C', badge: '🏆' },
  { rank: 'Tower Chief',      minXP: 40000, color: '#FFD700', badge: '👑' },
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
  onPause,
}: HUDProps) {
  const config = LEVELS[level - 1] ?? LEVELS[0];
  const landingTarget = getLandingTargetForLevel(level);
  const remainingLandings = Math.max(0, landingTarget - totalLandings);
  const { current: rank, progress: rankProgress } = getRankInfo(totalXP);
  const comboColor = getComboColor(combo.multiplier);

  const [eventAnim, setEventAnim] = useState(false);
  const [landingFlash, setLandingFlash] = useState(false);

  useEffect(() => {
    if (activeEvent) {
      setEventAnim(true);
      const t = setTimeout(() => setEventAnim(false), 2000);
      return () => clearTimeout(t);
    }
  }, [activeEvent]);

  const triggerLandingFlash = () => {
    setLandingFlash(true);
    setTimeout(() => setLandingFlash(false), 400);
  };

  // Expose flash trigger
  (HUD as any)._triggerFlash = triggerLandingFlash;

  const eventLabel: Record<string, string> = {
    runway_closed: '⛔ RUNWAY CLOSED',
    wind_shear:    '🌀 WIND SHEAR',
    vip_flight:    '★ VIP INBOUND',
    bird_strike:   '🐦 BIRD STRIKE ZONE',
  };

  return (
    <div style={styles.hud}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        {/* Score */}
        <div style={styles.panel}>
          <span style={styles.label}>SCORE</span>
          <span style={{ ...styles.bigValue, color: landingFlash ? '#FFD700' : COLORS.HUD_TEXT }}>
            {score.toLocaleString()}
          </span>
          <span style={{ ...styles.small, color: COLORS.HUD_DIM }}>
            HI {highScore.toLocaleString()}
          </span>
        </div>

        {/* Landing target */}
        <div style={{ ...styles.panel, textAlign: 'center', position: 'relative' }}>
          <span style={styles.label}>TO WIN</span>
          <span style={{ ...styles.bigValue, color: COLORS.HUD_ACCENT }}>
            {totalLandings} / {landingTarget}
          </span>
          <span style={{ ...styles.small, color: COLORS.HUD_DIM }}>
            {remainingLandings} LEFT · {config.airport.icao}
          </span>

          {/* Combo Bar (transparent under level) */}
          {combo.count > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(11, 19, 43, 0.5)',
              padding: '2px 8px',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.05)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none'
            }}>
              <span style={{ fontSize: 12, fontWeight: 'bold', color: comboColor, letterSpacing: 1 }}>
                {combo.count >= 5 ? '🔥 MAX' : combo.count >= 3 ? '⚡ STREAK' : 'CHAIN'}
              </span>
              <span style={{ fontSize: 16, fontWeight: 'bold', color: comboColor }}>
                ×{combo.multiplier}
              </span>
              <div style={{ width: 40, display: 'flex', alignItems: 'center' }}>
                <ComboTimer combo={combo} color={comboColor} />
              </div>
            </div>
          )}
        </div>

        {/* Traffic */}
        <div style={{ ...styles.panel, textAlign: 'center' }}>
          <span style={styles.label}>TRAFFIC</span>
          <span style={{ ...styles.bigValue, color: COLORS.HUD_TEXT }}>{aircraftCount}</span>
          <span style={{ ...styles.small, color: COLORS.HUD_DIM }}>
            MAX {config.maxAircraft}
          </span>
        </div>

        {/* Pause */}
        <button style={styles.pauseBtn} onClick={onPause} title="Pause [P]">
          ⏸
        </button>
      </div>

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
    </div>
  );
}

// ── Combo countdown timer ─────────────────────────────────────
function ComboTimer({ combo, color }: { combo: GameState['combo']; color: string }) {
  const [pct, setPct] = useState(1);
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - combo.lastLandingTime;
      setPct(Math.max(0, 1 - elapsed / combo.timeoutMs));
    }, 50);
    return () => clearInterval(id);
  }, [combo]);

  return (
    <div style={styles.comboTimerTrack}>
      <div style={{ ...styles.comboTimerFill, width: `${pct * 100}%`, background: color }} />
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
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    pointerEvents: 'auto', // buttons/interactions work
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 80,
  },
  label: {
    fontSize: 11,
    color: COLORS.HUD_DIM,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  bigValue: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 1.1,
    color: COLORS.HUD_TEXT,
  },
  small: {
    fontSize: 11,
    color: COLORS.HUD_DIM,
  },
  pauseBtn: {
    marginLeft: 'auto',
    background: 'transparent',
    border: '1px solid rgba(0,255,65,0.3)',
    color: COLORS.HUD_TEXT,
    padding: '4px 10px',
    cursor: 'pointer',
    fontSize: 16,
    borderRadius: 4,
  },
  comboBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '3px 8px',
    background: 'rgba(0,255,65,0.05)',
    borderRadius: 4,
  },
  comboText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  comboMultiplier: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  comboTimerTrack: {
    flex: 1,
    height: 4,
    background: 'rgba(0,255,65,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  comboTimerFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.05s linear',
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
