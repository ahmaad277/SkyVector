import React from 'react';
import { COLORS } from '../utils/colorPalette';
import StatRow from './shared/StatRow';

interface GameOverScreenProps {
  score: number;
  highScore: number;
  maxCombo: number;
  totalLandings: number;
  level: number;
  reason?: 'collision' | 'fuel' | 'vip_delay';
  isNewHighScore: boolean;
  onRestart: () => void;
  onMenu: () => void;
  onSubmitScore?: () => void;
  submitting?: boolean;
  teamFailure?: boolean;
  onLobby?: () => void;
}

export default function GameOverScreen({
  score,
  highScore,
  maxCombo,
  totalLandings,
  level,
  reason = 'collision',
  isNewHighScore,
  onRestart,
  onMenu,
  onSubmitScore,
  submitting = false,
  teamFailure = false,
  onLobby,
}: GameOverScreenProps) {
  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.crashIcon}>
          {teamFailure ? '🛡️' : reason === 'fuel' ? '⛽' : reason === 'vip_delay' ? '⏱️' : '💥'}
        </div>

        <h1 style={styles.title}>
          {teamFailure
            ? 'TEAM FAILED'
            : reason === 'fuel'
            ? 'OUT OF FUEL'
            : reason === 'vip_delay'
            ? 'CRITICAL DELAY'
            : 'MID-AIR COLLISION'}
        </h1>
        <p style={styles.sub}>
          {teamFailure
            ? 'Shared lives depleted. The team could not secure the airspace.'
            : reason === 'fuel'
            ? 'An aircraft ran out of fuel.'
            : reason === 'vip_delay'
            ? 'VIP / Mayday flight delayed too long.'
            : 'Airspace compromised. All traffic halted.'}
        </p>

        {isNewHighScore && (
          <div style={styles.newRecord}>
            ★ NEW PERSONAL RECORD ★
          </div>
        )}

        {/* Stats */}
        <div style={styles.statsGrid}>
          <StatRow label="FINAL SCORE" value={score.toLocaleString()} highlight />
          <StatRow label="HIGH SCORE"  value={highScore.toLocaleString()} />
          <StatRow label="MAX COMBO"   value={`×${maxCombo}`} />
          <StatRow label="LANDINGS"    value={`${totalLandings}`} />
          <StatRow label="REACHED LVL" value={`${level}`} />
        </div>

        {/* Actions */}
        <div style={styles.btnRow}>
          {teamFailure && onLobby ? (
            <button style={styles.btnPrimary} onClick={onLobby}>
              BACK TO LOBBY
            </button>
          ) : (
            <button style={styles.btnPrimary} onClick={onRestart}>
              ↺ RETRY
            </button>
          )}
          <button style={styles.btnSecondary} onClick={onMenu}>
            ⌂ MENU
          </button>
        </div>

        {onSubmitScore && (
          <button
            style={{ ...styles.btnSubmit, opacity: submitting ? 0.5 : 1 }}
            onClick={onSubmitScore}
            disabled={submitting}
          >
            {submitting ? 'SUBMITTING...' : '🌐 SUBMIT TO LEADERBOARD'}
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    background: 'rgba(11,19,43,0.92)',
    fontFamily: 'var(--font-mono)',
    backdropFilter: 'blur(2px)',
    overflowY: 'auto',
    padding: '40px 0',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    padding: '30px 32px',
    background: COLORS.BG_PANEL,
    border: '1px solid rgba(255,0,60,0.4)',
    borderRadius: 8,
    maxWidth: 380,
    width: '90%',
    boxShadow: '0 0 40px rgba(255,0,60,0.15)',
    margin: 'auto',
  },
  crashIcon: {
    fontSize: 52,
    lineHeight: 1,
    filter: 'drop-shadow(0 0 12px rgba(255,0,60,0.8))',
  },
  title: {
    margin: 0,
    fontSize: 26,
    fontWeight: 900,
    color: COLORS.HUD_DANGER,
    letterSpacing: 2,
    textAlign: 'center',
  },
  sub: {
    margin: 0,
    fontSize: 13,
    color: COLORS.HUD_DIM,
    letterSpacing: 1,
  },
  newRecord: {
    padding: '6px 14px',
    background: 'rgba(255,215,0,0.1)',
    border: '1px solid rgba(255,215,0,0.4)',
    borderRadius: 4,
    color: COLORS.HUD_GOLD,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    animation: 'pulse 1s infinite',
  },
  statsGrid: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '10px 0',
    borderTop: '1px solid rgba(0,255,65,0.1)',
    borderBottom: '1px solid rgba(0,255,65,0.1)',
  },
  btnRow: {
    display: 'flex',
    gap: 10,
    width: '100%',
  },
  btnPrimary: {
    flex: 1,
    padding: '10px 0',
    background: 'rgba(0,255,65,0.1)',
    border: '1px solid rgba(0,255,65,0.5)',
    color: COLORS.HUD_TEXT,
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    fontWeight: 'bold',
    cursor: 'pointer',
    borderRadius: 5,
    letterSpacing: 1,
  },
  btnSecondary: {
    flex: 1,
    padding: '10px 0',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    color: COLORS.HUD_DIM,
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    cursor: 'pointer',
    borderRadius: 5,
    letterSpacing: 1,
  },
  btnSubmit: {
    width: '100%',
    padding: '8px 0',
    background: 'rgba(0,180,216,0.1)',
    border: '1px solid rgba(0,180,216,0.4)',
    color: COLORS.HUD_ACCENT,
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    cursor: 'pointer',
    borderRadius: 5,
    letterSpacing: 1,
  },
};
