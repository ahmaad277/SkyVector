import React, { useEffect, useState } from 'react';
import type { SurvivalState } from '../types/survival.types';
import type { DailyMission, GameEvent } from '../types/game.types';
import { POWER_UPS } from '../engine/SurvivalEngine';
import { COLORS } from '../utils/colorPalette';
import DailyMissionsPanel from './hud/DailyMissionsPanel';
import GameTopBar from './hud/GameTopBar';
import EventTimer, { eventLabel } from './shared/EventTimer';

interface SurvivalHUDProps {
  survivalState: SurvivalState;
  missions: DailyMission[];
  activeEvent: GameEvent | null;
  onPause: () => void;
}

export default function SurvivalHUD({ survivalState, missions, activeEvent, onPause }: SurvivalHUDProps) {
  const [now, setNow] = useState(Date.now());
  const [eventAnim, setEventAnim] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (activeEvent) {
      setEventAnim(true);
      const t = setTimeout(() => setEventAnim(false), 2000);
      return () => clearTimeout(t);
    }
  }, [activeEvent]);

  return (
    <div style={styles.root}>
      {/* Top Bar */}
      <GameTopBar
        onPause={onPause}
        survivalState={survivalState}
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
            {eventLabel[activeEvent.type] ? eventLabel[activeEvent.type](activeEvent) : '⚠ ALERT'}
          </span>
          <EventTimer event={activeEvent} />
        </div>
      )}

      {/* Active Buffs */}
      {survivalState.activeBuffs.length > 0 && (
        <div style={styles.buffsContainer}>
          {survivalState.activeBuffs.map((buff, i) => {
            const def = POWER_UPS[buff.type];
            const timeLeft = buff.expiresAt === Infinity ? '∞' : Math.ceil((buff.expiresAt - now) / 1000) + 's';
            return (
              <div key={i} style={styles.buffBadge}>
                <span style={styles.buffName}>{def.name}</span>
                {timeLeft !== '∞' && <span style={styles.buffTime}>{timeLeft}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Streak Indicator */}
      {survivalState.typeStreak.count > 0 && (
        <div style={styles.streakContainer}>
          <div style={styles.streakLabel}>STREAK: {survivalState.typeStreak.type?.toUpperCase()}</div>
          <div style={styles.streakDots}>
            {[1, 2, 3].map(n => (
              <div key={n} style={{
                ...styles.streakDot,
                background: n <= survivalState.typeStreak.count ? '#FFD700' : 'rgba(255,255,255,0.2)',
                boxShadow: n <= survivalState.typeStreak.count ? '0 0 8px rgba(255,215,0,0.5)' : 'none',
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Daily Missions Panel */}
      <DailyMissionsPanel missions={missions} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100%',
    padding: '6px 10px',
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  eventBanner: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 10px',
    background: 'rgba(255,0,60,0.12)',
    border: '1px solid rgba(255,0,60,0.4)',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  eventText: {
    color: COLORS.HUD_DANGER,
    fontWeight: 'bold',
    fontSize: 'clamp(11px, 3.5vw, 14px)',
    letterSpacing: 1,
  },
  buffsContainer: {
    position: 'absolute',
    top: 80,
    right: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    alignItems: 'flex-end',
  },
  buffBadge: {
    background: 'rgba(255, 215, 0, 0.15)',
    border: '1px solid rgba(255, 215, 0, 0.5)',
    borderRadius: 4,
    padding: '4px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    backdropFilter: 'blur(4px)',
  },
  buffName: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'clamp(8px, 2.5vw, 10px)',
    fontWeight: 700,
    color: '#FFD700',
    letterSpacing: 1,
  },
  buffTime: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'clamp(8px, 2.5vw, 10px)',
    color: '#FFF',
  },
  streakContainer: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.6)',
    border: '1px solid rgba(255,215,0,0.3)',
    borderRadius: 12,
    padding: '6px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  streakLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'clamp(9px, 3vw, 12px)',
    color: '#FFD700',
    letterSpacing: 1,
  },
  streakDots: {
    display: 'flex',
    gap: 6,
  },
  streakDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    transition: 'all 0.2s',
  },
};
