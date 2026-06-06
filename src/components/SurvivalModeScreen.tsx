import React from 'react';
import { COLORS } from '../utils/colorPalette';

interface SurvivalModeScreenProps {
  onStart: () => void;
  onBack: () => void;
}

export default function SurvivalModeScreen({ onStart, onBack }: SurvivalModeScreenProps) {
  return (
    <div style={styles.root}>
      <div style={styles.gridBg} aria-hidden="true" />

      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 14L6 9l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          BACK
        </button>
        <div style={styles.headerTitle}>SURVIVAL MODE</div>
        <div style={{ width: 72 }} />
      </div>

      <div style={styles.content}>
        <div style={styles.card}>
          <div style={styles.icon}>⚠️</div>
          <h1 style={styles.title}>ENDLESS OPERATIONS</h1>
          <p style={styles.desc}>
            Manage increasingly difficult waves of aircraft. Meet the landing quota before time runs out to advance to the next round.
          </p>

          <div style={styles.features}>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>❤️</span>
              <div>
                <div style={styles.featureTitle}>HEALTH SYSTEM</div>
                <div style={styles.featureDesc}>Start with 10 health. Collisions (-2), fuel exhaustion (-1), and delays (-1) reduce health.</div>
              </div>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>⚡</span>
              <div>
                <div style={styles.featureTitle}>POWER-UPS</div>
                <div style={styles.featureDesc}>Land 3 of the same aircraft type in a row to trigger special abilities.</div>
              </div>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>🌪️</span>
              <div>
                <div style={styles.featureTitle}>ESCALATING HAZARDS</div>
                <div style={styles.featureDesc}>Face wind shear, radar sweeps, and bird strikes in later rounds.</div>
              </div>
            </div>
          </div>

          <button style={styles.startBtn} onClick={onStart}>
            COMMENCE OPERATIONS
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    background: COLORS.BG_DEEP,
    overflow: 'hidden',
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
    animation: 'fadeIn 0.3s ease both',
  },
  gridBg: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(255,0,60,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,0,60,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '48px 48px',
    pointerEvents: 'none',
  },
  header: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px 12px',
    borderBottom: '1px solid rgba(255,0,60,0.15)',
    background: 'rgba(11, 19, 37, 0.85)',
    backdropFilter: 'blur(8px)',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'var(--font-title)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    color: 'rgba(255,0,60,0.6)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: 6,
    transition: 'color 0.15s ease',
    width: 72,
  },
  headerTitle: {
    fontFamily: 'var(--font-title)',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 4,
    color: '#FF003C',
    textShadow: '0 0 12px rgba(255,0,60,0.5)',
  },
  content: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    position: 'relative',
    zIndex: 1,
  },
  card: {
    background: 'rgba(13, 27, 42, 0.85)',
    border: '1px solid rgba(255,0,60,0.3)',
    borderRadius: 16,
    padding: 32,
    maxWidth: 480,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(255,0,60,0.1)',
  },
  icon: {
    fontSize: 48,
    filter: 'drop-shadow(0 0 10px rgba(255,0,60,0.5))',
  },
  title: {
    fontFamily: 'var(--font-title)',
    fontSize: 24,
    fontWeight: 800,
    color: '#FFF',
    margin: 0,
    letterSpacing: 2,
    textAlign: 'center',
  },
  desc: {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 1.5,
    margin: 0,
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    width: '100%',
    background: 'rgba(0,0,0,0.2)',
    padding: 20,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  feature: {
    display: 'flex',
    gap: 16,
    alignItems: 'flex-start',
  },
  featureIcon: {
    fontSize: 20,
  },
  featureTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    fontWeight: 700,
    color: '#FF003C',
    letterSpacing: 1,
    marginBottom: 4,
  },
  featureDesc: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.4,
  },
  startBtn: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(90deg, #FF003C 0%, #990024 100%)',
    border: 'none',
    borderRadius: 8,
    color: '#FFF',
    fontFamily: 'var(--font-title)',
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: 3,
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(255,0,60,0.4)',
    transition: 'transform 0.1s, box-shadow 0.1s',
  },
};
