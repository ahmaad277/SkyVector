import React from 'react';
import { COLORS } from '../utils/colorPalette';

interface PauseScreenProps {
  onResume: () => void;
  onMenu: () => void;
  score: number;
}

export default function PauseScreen({ onResume, onMenu, score }: PauseScreenProps) {
  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.icon}>⏸</div>
        <h2 style={styles.title}>PAUSED</h2>
        <div style={styles.scoreRow}>
          <span style={styles.scoreLabel}>CURRENT SCORE</span>
          <span style={styles.scoreValue}>{score.toLocaleString()}</span>
        </div>
        <button style={styles.btnPrimary} onClick={onResume}>
          ▶ RESUME
        </button>
        <button style={styles.btnSecondary} onClick={onMenu}>
          ⌂ MAIN MENU
        </button>
        <div style={styles.hint}>
          Press <kbd style={styles.kbd}>P</kbd> or <kbd style={styles.kbd}>ESC</kbd> to resume
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(11,19,43,0.88)',
    fontFamily: '"Courier New", monospace',
    backdropFilter: 'blur(2px)',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: '28px 36px',
    background: COLORS.BG_PANEL,
    border: '1px solid rgba(0,255,65,0.2)',
    borderRadius: 8,
    minWidth: 260,
  },
  icon: { fontSize: 40 },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 900,
    color: COLORS.HUD_TEXT,
    letterSpacing: 4,
  },
  scoreRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '8px 20px',
    border: '1px solid rgba(0,255,65,0.15)',
    borderRadius: 5,
    width: '100%',
  },
  scoreLabel: {
    fontSize: 9,
    color: COLORS.HUD_DIM,
    letterSpacing: 2,
  },
  scoreValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.HUD_TEXT,
  },
  btnPrimary: {
    width: '100%',
    padding: '10px 0',
    background: 'rgba(0,255,65,0.1)',
    border: '1px solid rgba(0,255,65,0.5)',
    color: COLORS.HUD_TEXT,
    fontFamily: '"Courier New", monospace',
    fontSize: 14,
    fontWeight: 'bold',
    cursor: 'pointer',
    borderRadius: 5,
    letterSpacing: 1,
  },
  btnSecondary: {
    width: '100%',
    padding: '8px 0',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    color: COLORS.HUD_DIM,
    fontFamily: '"Courier New", monospace',
    fontSize: 12,
    cursor: 'pointer',
    borderRadius: 5,
  },
  hint: {
    fontSize: 10,
    color: COLORS.HUD_DIM,
    letterSpacing: 1,
  },
  kbd: {
    display: 'inline-block',
    padding: '1px 5px',
    background: 'rgba(0,255,65,0.08)',
    border: '1px solid rgba(0,255,65,0.25)',
    borderRadius: 3,
    fontSize: 10,
    color: COLORS.HUD_TEXT,
    fontFamily: '"Courier New", monospace',
  },
};
