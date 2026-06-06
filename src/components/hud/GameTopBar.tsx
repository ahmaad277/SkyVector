import React, { useEffect, useState } from 'react';
import type { GameState } from '../../types/game.types';
import { COLORS, getComboColor } from '../../utils/colorPalette';
import type { SurvivalState } from '../../types/survival.types';

interface GameTopBarProps {
  // Common
  onPause: () => void;
  
  // Campaign
  score?: number;
  highScore?: number;
  combo?: GameState['combo'];
  level?: number;
  totalLandings?: number;
  landingTarget?: number;
  airportIcao?: string;
  aircraftCount?: number;
  maxAircraft?: number;
  lives?: number;
  
  // Survival
  survivalState?: SurvivalState;
}

export default function GameTopBar({
  onPause,
  score,
  highScore,
  combo,
  totalLandings,
  landingTarget,
  airportIcao,
  aircraftCount,
  maxAircraft,
  lives,
  survivalState,
}: GameTopBarProps) {
  const isSurvival = !!survivalState;

  // Survival specific logic
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!isSurvival) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isSurvival]);

  let displayScore = score ?? 0;
  let displayTarget = `${totalLandings} / ${landingTarget}`;
  let displayTraffic = aircraftCount ?? 0;
  let displayTrafficMax = maxAircraft ?? 0;

  if (isSurvival && survivalState) {
    displayScore = survivalState.totalScore;
    displayTarget = `${survivalState.roundLandings} / ${survivalState.roundLandingTarget}`;
    
    // Calculate remaining time for survival
    const elapsed = now - survivalState.roundStartTime;
    const remaining = Math.max(0, survivalState.roundTimerMs - elapsed);
    const seconds = Math.ceil(remaining / 1000);
    displayTraffic = seconds; // Reuse traffic slot for timer
  }

  return (
    <div style={styles.topBar}>
      {/* Score */}
      <div style={styles.panel}>
        <span style={styles.label}>SCORE</span>
        <span style={{ ...styles.bigValue, color: COLORS.HUD_TEXT }}>
          {displayScore.toLocaleString()}
        </span>
        {isSurvival ? (
          <span style={{ ...styles.small, color: COLORS.HUD_DIM }}>
            ROUND {survivalState?.round}
          </span>
        ) : (
          <span style={{ ...styles.small, color: COLORS.HUD_DIM }}>
            HI {highScore?.toLocaleString()}
          </span>
        )}
      </div>

      {/* Landing target / Quota */}
      <div style={{ ...styles.panel, textAlign: 'center', position: 'relative' }}>
        <span style={styles.label}>{isSurvival ? 'QUOTA' : 'TO WIN'}</span>
        <span style={{ ...styles.bigValue, color: COLORS.HUD_ACCENT }}>
          {displayTarget}
        </span>
        {!isSurvival && (
          <span style={{ ...styles.small, color: COLORS.HUD_DIM }}>
            {Math.max(0, (landingTarget ?? 0) - (totalLandings ?? 0))} LEFT · {airportIcao}
          </span>
        )}

        {/* Combo Bar (Campaign only) */}
        {!isSurvival && combo && combo.count > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '10%',
            transform: 'translateX(-30%)',
            marginTop: 12,
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
            <span style={{ fontSize: 12, fontWeight: 'bold', color: getComboColor(combo.multiplier), letterSpacing: 1 }}>
              {combo.count >= 5 ? '🔥 MAX' : combo.count >= 3 ? '⚡ STREAK' : 'CHAIN'}
            </span>
            <span style={{ fontSize: 16, fontWeight: 'bold', color: getComboColor(combo.multiplier) }}>
              ×{combo.multiplier}
            </span>
            <div style={{ width: 40, display: 'flex', alignItems: 'center' }}>
              <ComboTimer combo={combo} color={getComboColor(combo.multiplier)} />
            </div>
          </div>
        )}
      </div>

      {/* Traffic / Timer */}
      <div style={{ ...styles.panel, textAlign: 'center' }}>
        <span style={styles.label}>{isSurvival ? 'TIMER' : 'TRAFFIC'}</span>
        <span style={{ 
          ...styles.bigValue, 
          color: isSurvival && displayTraffic <= 10 ? '#FF003C' : COLORS.HUD_TEXT,
          animation: isSurvival && displayTraffic <= 10 ? 'pulse 1s infinite' : 'none'
        }}>
          {isSurvival ? `${displayTraffic}s` : displayTraffic}
        </span>
        {!isSurvival && (
          <span style={{ ...styles.small, color: COLORS.HUD_DIM }}>
            MAX {displayTrafficMax}
          </span>
        )}
      </div>

      {/* Lives / Hull */}
      <div style={{ ...styles.panel, textAlign: 'center' }}>
        <span style={styles.label}>{isSurvival ? 'HULL INTEGRITY' : 'LIVES'}</span>
        {isSurvival && survivalState ? (
          <div style={{ width: 100, height: 8, background: 'rgba(0,0,0,0.5)', borderRadius: 4, marginTop: 8, overflow: 'hidden', margin: '8px auto 0' }}>
            <div style={{
              height: '100%',
              width: `${(survivalState.health / 10) * 100}%`,
              background: survivalState.health <= 3 ? '#FF003C' : '#39FF14',
              transition: 'width 0.3s ease',
              animation: survivalState.health <= 3 ? 'pulse 1s infinite' : 'none'
            }} />
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'center' }}>
            {[1, 2, 3].map(i => (
              <span key={i} style={{ fontSize: 18, color: i <= (lives ?? 0) ? '#FF003C' : 'rgba(255,0,60,0.2)' }}>
                ♥
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pause */}
      <button style={styles.pauseBtn} onClick={onPause} title="Pause [P]">
        ⏸
      </button>
    </div>
  );
}

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

const styles: Record<string, React.CSSProperties> = {
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    pointerEvents: 'auto',
    width: '100%',
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
};
