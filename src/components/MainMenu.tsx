import React from 'react';
import { COLORS } from '../utils/colorPalette';
import { LEVELS } from '../levels';

interface MainMenuProps {
  onStartLevel: (level: number) => void;
  highScore: number;
  unlockedLevel: number;
}

export default function MainMenu({ onStartLevel, highScore, unlockedLevel }: MainMenuProps) {
  return (
    <div style={styles.overlay}>
      {/* Subtle background decoration instead of dense rings */}
      <div style={styles.radarBg} aria-hidden="true">
        {[150, 300].map((r) => (
          <div key={r} style={{ ...styles.ring, width: r * 2, height: r * 2 }} />
        ))}
      </div>

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logo}>
          <span style={styles.logoAccent}>SKY</span>
          <span style={styles.logoMain}>VECTOR</span>
        </div>
        <div style={styles.subtitle}>AIR COMMAND</div>
        <div style={styles.tagline}>Radar Air Traffic Control</div>

        {/* High Score */}
        {highScore > 0 && (
          <div style={styles.hiBadge}>
            <span style={{ color: COLORS.HUD_DIM, fontSize: 12, fontWeight: 600, letterSpacing: 1 }}>PERSONAL BEST</span>
            <span style={{ color: COLORS.HUD_GOLD, fontSize: 26, fontWeight: 'bold' }}>
              {highScore.toLocaleString()}
            </span>
          </div>
        )}

        {/* Level Selection */}
        <div style={styles.levelGrid}>
          {LEVELS.map((lvl) => {
            const locked = lvl.id > unlockedLevel;
            return (
              <button
                key={lvl.id}
                style={{ ...styles.levelBtn, ...(locked ? styles.locked : {}) }}
                onClick={() => !locked && onStartLevel(lvl.id)}
                disabled={locked}
                title={locked ? 'Complete previous levels to unlock' : ''}
              >
                <span style={styles.lvlNum}>LEVEL {lvl.id}</span>
                <span style={styles.lvlName}>{lvl.name}</span>
                <span style={styles.lvlSub}>{lvl.subtitle}</span>
                {locked && <span style={styles.lockIcon}>🔒</span>}
              </button>
            );
          })}
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
    alignItems: 'flex-start',
    justifyContent: 'center',
    background: COLORS.BG_DEEP,
    fontFamily: '"Courier New", monospace',
    overflowY: 'auto',
    padding: '40px 0',
  },
  radarBg: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  ring: {
    position: 'absolute',
    borderRadius: '50%',
    border: `1px solid ${COLORS.RADAR_GRID}`,
  },
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    padding: '32px 24px',
    background: COLORS.BG_PANEL,
    border: `1px solid rgba(0, 255, 65, 0.1)`,
    borderRadius: 20,
    maxWidth: 480,
    width: '90%',
    boxShadow: `0 20px 50px rgba(0, 0, 0, 0.5)`,
    margin: 'auto',
  },
  logo: {
    fontSize: 56,
    fontWeight: 900,
    letterSpacing: 4,
    lineHeight: 1,
    display: 'flex',
    gap: 0,
  },
  logoAccent: { color: COLORS.HUD_ACCENT },
  logoMain: { color: '#FFFFFF' },
  subtitle: {
    fontSize: 16,
    fontWeight: 400,
    letterSpacing: 8,
    color: COLORS.HUD_DIM,
    marginTop: -20,
  },
  hiBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 32px',
    background: 'rgba(255, 215, 0, 0.05)',
    border: `1px solid rgba(255, 215, 0, 0.2)`,
    borderRadius: 8,
    gap: 4,
    width: '100%',
  },
  levelGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    width: '100%',
  },
  levelBtn: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '18px 20px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: `1px solid rgba(255, 255, 255, 0.08)`,
    borderRadius: 12,
    cursor: 'pointer',
    color: '#FFFFFF',
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'all 0.2s ease',
    gap: 4,
  },
  locked: {
    background: 'transparent',
    border: '1px dashed rgba(255, 255, 255, 0.1)',
    cursor: 'not-allowed',
    color: 'rgba(255,255,255,0.3)',
    opacity: 0.5,
  },
  lvlNum: {
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.HUD_ACCENT,
    letterSpacing: 2,
  },
  lvlName: {
    fontSize: 16,
    fontWeight: 800,
    color: 'inherit',
  },
  lvlSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
    lineHeight: 1.3,
  },
  lockIcon: {
    position: 'absolute',
    top: 18,
    right: 16,
    fontSize: 14,
  },
};
