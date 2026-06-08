import React from 'react';
import type { SurvivalState } from '../types/survival.types';
import StatRow from './shared/StatRow';

interface SurvivalGameOverProps {
  state: SurvivalState;
  onRetry: () => void;
  onMenu: () => void;
  onSubmitScore?: () => void;
  submitting?: boolean;
}

export default function SurvivalGameOver({ state, onRetry, onMenu, onSubmitScore, submitting }: SurvivalGameOverProps) {
  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.icon}>💀</div>
        <h1 style={styles.title}>OPERATIONS CEASED</h1>
        <p style={styles.sub}>Hull integrity compromised or time expired.</p>

        <div style={styles.statsGrid}>
          <StatRow label="ROUNDS SURVIVED" value={`${state.round - 1}`} highlight />
          <StatRow label="TOTAL SCORE" value={state.totalScore.toLocaleString()} />
          <StatRow label="AIRCRAFT LANDED" value={`${state.totalLandings}`} />
        </div>

        <div style={styles.btnRow}>
          <button style={styles.btnPrimary} onClick={onRetry}>
            ↺ RETRY
          </button>
          <button style={styles.btnSecondary} onClick={onMenu}>
            ⌂ MENU
          </button>
        </div>
        {onSubmitScore && (
          <button
            style={styles.btnSubmit}
            onClick={onSubmitScore}
            disabled={submitting}
          >
            {submitting ? 'SUBMITTING...' : 'SUBMIT TO LEADERBOARD'}
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
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(11,19,43,0.92)',
    backdropFilter: 'blur(4px)',
    zIndex: 100,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    padding: '30px 32px',
    background: 'rgba(13, 27, 42, 0.95)',
    border: '1px solid rgba(255,0,60,0.4)',
    borderRadius: 12,
    maxWidth: 380,
    width: '90%',
    boxShadow: '0 0 40px rgba(255,0,60,0.15)',
  },
  icon: {
    fontSize: 48,
    filter: 'drop-shadow(0 0 12px rgba(255,0,60,0.8))',
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 900,
    color: '#FF003C',
    letterSpacing: 2,
    fontFamily: 'var(--font-title)',
  },
  sub: {
    margin: 0,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'var(--font-mono)',
  },
  statsGrid: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '16px 0',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  btnRow: {
    display: 'flex',
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  btnPrimary: {
    flex: 1,
    padding: '12px 0',
    background: 'rgba(255,0,60,0.1)',
    border: '1px solid rgba(255,0,60,0.5)',
    color: '#FFF',
    fontFamily: 'var(--font-title)',
    fontSize: 13,
    fontWeight: 'bold',
    cursor: 'pointer',
    borderRadius: 6,
    letterSpacing: 1,
  },
  btnSecondary: {
    flex: 1,
    padding: '12px 0',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'var(--font-title)',
    fontSize: 13,
    cursor: 'pointer',
    borderRadius: 6,
    letterSpacing: 1,
  },
  btnSubmit: {
    width: '100%',
    padding: '12px 0',
    background: 'rgba(0, 240, 255, 0.1)',
    border: '1px solid rgba(0, 240, 255, 0.5)',
    color: '#00F0FF',
    fontFamily: 'var(--font-title)',
    fontSize: 13,
    fontWeight: 'bold',
    cursor: 'pointer',
    borderRadius: 6,
    letterSpacing: 1,
  },
};
