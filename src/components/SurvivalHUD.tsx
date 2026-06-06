import React, { useEffect, useState } from 'react';
import type { SurvivalState } from '../types/survival.types';
import type { DailyMission } from '../types/game.types';
import { POWER_UPS } from '../engine/SurvivalEngine';

interface SurvivalHUDProps {
  survivalState: SurvivalState;
  missions: DailyMission[];
  onPause: () => void;
}

export default function SurvivalHUD({ survivalState, missions, onPause }: SurvivalHUDProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = now - survivalState.roundStartTime;
  const remaining = Math.max(0, survivalState.roundTimerMs - elapsed);
  const seconds = Math.ceil(remaining / 1000);

  const healthPercent = (survivalState.health / 10) * 100;
  const isLowHealth = survivalState.health <= 3;

  return (
    <div style={styles.root}>
      {/* Top Bar */}
      <div style={styles.topBar}>
        <div style={styles.leftGroup}>
          <div style={styles.roundBox}>
            <div style={styles.label}>ROUND</div>
            <div style={styles.value}>{survivalState.round}</div>
          </div>
          
          <div style={styles.healthBox}>
            <div style={styles.label}>HULL INTEGRITY</div>
            <div style={styles.healthBarBg}>
              <div style={{
                ...styles.healthBarFill,
                width: `${healthPercent}%`,
                background: isLowHealth ? '#FF003C' : '#39FF14',
                animation: isLowHealth ? 'pulse 1s infinite' : 'none',
              }} />
            </div>
          </div>
        </div>

        <div style={styles.centerGroup}>
          <div style={{
            ...styles.timerBox,
            color: seconds <= 10 ? '#FF003C' : '#FFF',
            animation: seconds <= 10 ? 'pulse 1s infinite' : 'none',
          }}>
            {seconds}s
          </div>
          <div style={styles.quotaBox}>
            QUOTA: {survivalState.roundLandings} / {survivalState.roundLandingTarget}
          </div>
        </div>

        <div style={styles.rightGroup}>
          <div style={styles.scoreBox}>
            <div style={styles.label}>SCORE</div>
            <div style={styles.value}>{survivalState.totalScore.toLocaleString()}</div>
          </div>
          <button style={styles.pauseBtn} onClick={onPause}>⏸</button>
        </div>
      </div>

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
      <div style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        width: 280,
        background: 'rgba(11, 19, 43, 0.85)',
        border: '1px solid rgba(0, 240, 255, 0.2)',
        borderRadius: 6,
        padding: '8px 12px',
        pointerEvents: 'auto',
        maxHeight: 120,
        overflowY: 'auto',
      }}>
        <div style={{ fontSize: 10, color: '#00F0FF', fontWeight: 'bold', marginBottom: 6, letterSpacing: 1 }}>
          DAILY MISSIONS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
          {missions.map(m => (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 9, color: m.completed ? '#39FF14' : 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.description}>
                {m.completed ? '✓ ' : ''}{m.description}
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                <div style={{ height: '100%', background: m.completed ? '#39FF14' : '#00F0FF', width: `${Math.min(100, (m.current / m.target) * 100)}%`, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100%',
    padding: '12px 16px',
    pointerEvents: 'none',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  leftGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    flex: 1,
  },
  centerGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  rightGroup: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    gap: 12,
    flex: 1,
  },
  roundBox: {
    background: 'rgba(13, 27, 42, 0.8)',
    border: '1px solid rgba(255,0,60,0.4)',
    borderRadius: 6,
    padding: '6px 12px',
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  label: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
  },
  value: {
    fontFamily: 'var(--font-title)',
    fontSize: 18,
    color: '#FF003C',
    fontWeight: 800,
  },
  healthBox: {
    background: 'rgba(13, 27, 42, 0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '6px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    width: 140,
  },
  healthBarBg: {
    width: '100%',
    height: 6,
    background: 'rgba(0,0,0,0.5)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    transition: 'width 0.3s ease, background-color 0.3s ease',
  },
  timerBox: {
    fontFamily: 'var(--font-title)',
    fontSize: 28,
    fontWeight: 900,
    textShadow: '0 0 10px rgba(0,0,0,0.8)',
    letterSpacing: 2,
  },
  quotaBox: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: '#FFF',
    background: 'rgba(0,0,0,0.6)',
    padding: '4px 10px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.2)',
  },
  scoreBox: {
    background: 'rgba(13, 27, 42, 0.8)',
    border: '1px solid rgba(0,240,255,0.3)',
    borderRadius: 6,
    padding: '6px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  pauseBtn: {
    pointerEvents: 'auto',
    background: 'rgba(13, 27, 42, 0.8)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#FFF',
    borderRadius: 6,
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 16,
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
    fontSize: 10,
    fontWeight: 700,
    color: '#FFD700',
    letterSpacing: 1,
  },
  buffTime: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
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
    fontSize: 10,
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
