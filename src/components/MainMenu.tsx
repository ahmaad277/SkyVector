import React, { useState } from 'react';
import { COLORS } from '../utils/colorPalette';

interface MainMenuProps {
  onContinue: () => void;
  onNewGame: () => void;
  onLeaderboard: () => void;
  onSettings: () => void;
  highScore: number;
  canContinue: boolean;
}

export default function MainMenu({
  onContinue,
  onNewGame,
  onLeaderboard,
  onSettings,
  highScore,
  canContinue,
}: MainMenuProps) {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  const buttons = [
    { id: 'continue',    label: 'CONTINUE',    action: onContinue,    disabled: !canContinue },
    { id: 'newgame',     label: 'NEW GAME',     action: onNewGame,     disabled: false },
    { id: 'leaderboard', label: 'LEADERBOARD',  action: onLeaderboard, disabled: false },
    { id: 'settings',    label: 'SETTINGS',     action: onSettings,    disabled: false },
  ];

  return (
    <div style={styles.root}>
      {/* Radar background decoration */}
      <div style={styles.radarBg} aria-hidden="true">
        <div style={styles.radarSweepWrap}>
          <div style={styles.radarSweep} />
        </div>
        {[120, 230, 340].map((r, i) => (
          <div
            key={r}
            className="radar-ring-animate"
            style={{
              ...styles.ring,
              width: r * 2,
              height: r * 2,
              animationDelay: `${i * 1.1}s`,
            }}
          />
        ))}
      </div>

      {/* Content card */}
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logo}>
            <span style={styles.logoSky}>SKY</span>
            <span style={styles.logoVector}>VECTOR</span>
          </div>
          <div style={styles.subtitle}>AIR COMMAND</div>
          <div style={styles.tagline}>Radar Air Traffic Control</div>
        </div>

        {/* Personal best badge */}
        {highScore > 0 && (
          <div style={styles.hiBadge}>
            <span style={styles.hiLabel}>PERSONAL BEST</span>
            <span style={styles.hiScore}>{highScore.toLocaleString()}</span>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={styles.btnStack}>
          {buttons.map(({ id, label, action, disabled }) => {
            const isHovered = hoveredBtn === id && !disabled;
            return (
              <button
                key={id}
                style={{
                  ...styles.btn,
                  ...(disabled ? styles.btnDisabled : {}),
                  ...(isHovered ? styles.btnHover : {}),
                }}
                onClick={action}
                disabled={disabled}
                onMouseEnter={() => setHoveredBtn(id)}
                onMouseLeave={() => setHoveredBtn(null)}
                onTouchStart={() => setHoveredBtn(id)}
                onTouchEnd={() => setHoveredBtn(null)}
              >
                <span style={disabled ? styles.btnTextDisabled : styles.btnText}>
                  {label}
                </span>
                {!disabled && (
                  <span style={{ ...styles.btnArrow, opacity: isHovered ? 1 : 0 }}>
                    ›
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={styles.version}>v1.0 · SKYVECTOR</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: COLORS.BG_DEEP,
    overflow: 'hidden',
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  },

  // ── Radar background ──
  radarBg: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  radarSweepWrap: {
    position: 'absolute',
    width: 700,
    height: 700,
    borderRadius: '50%',
    overflow: 'hidden',
    animation: 'radarSweep 6s linear infinite',
  },
  radarSweep: {
    position: 'absolute',
    inset: 0,
    background:
      'conic-gradient(from 0deg, transparent 0deg, rgba(57,255,20,0.10) 25deg, transparent 60deg)',
    borderRadius: '50%',
  },
  ring: {
    position: 'absolute',
    borderRadius: '50%',
    border: `1px solid rgba(0, 240, 255, 0.12)`,
  },

  // ── Content card ──
  card: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    padding: '40px 32px 28px',
    background: 'rgba(13, 27, 42, 0.72)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(0, 240, 255, 0.15)',
    borderRadius: 20,
    maxWidth: 400,
    width: '88%',
    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6), inset 0 0 40px rgba(0,240,255,0.02)',
    animation: 'fadeInUp 0.5s ease both',
  },

  // ── Logo ──
  logoWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  logo: {
    fontFamily: 'var(--font-title)',
    fontSize: 52,
    fontWeight: 900,
    letterSpacing: 3,
    lineHeight: 1,
    display: 'flex',
    gap: 0,
  },
  logoSky: {
    color: '#00F0FF',
    textShadow: '0 0 20px rgba(0,240,255,0.8), 0 0 40px rgba(0,240,255,0.35)',
  },
  logoVector: {
    color: '#FFFFFF',
    textShadow: '0 0 12px rgba(255,255,255,0.3)',
  },
  subtitle: {
    fontFamily: 'var(--font-title)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 10,
    color: 'rgba(0,240,255,0.5)',
    marginTop: 2,
  },
  tagline: {
    fontFamily: 'var(--font-ui)',
    fontSize: 12,
    fontWeight: 400,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1,
    marginTop: 6,
  },

  // ── High Score badge ──
  hiBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    padding: '10px 20px',
    background: 'rgba(255,215,0,0.04)',
    border: '1px solid rgba(255,215,0,0.18)',
    borderRadius: 10,
    gap: 2,
  },
  hiLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 2,
    color: 'rgba(255,215,0,0.55)',
  },
  hiScore: {
    fontFamily: 'var(--font-mono)',
    fontSize: 28,
    fontWeight: 700,
    color: '#FFD700',
    textShadow: '0 0 12px rgba(255,215,0,0.4)',
  },

  // ── Button stack ──
  btnStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: '100%',
  },
  btn: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 24px',
    background: 'rgba(0, 240, 255, 0.04)',
    border: '1px solid rgba(0, 240, 255, 0.22)',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    boxShadow: 'inset 0 0 16px rgba(0,240,255,0.02)',
  },
  btnHover: {
    background: 'rgba(0, 240, 255, 0.09)',
    border: '1px solid rgba(0, 240, 255, 0.55)',
    boxShadow: '0 0 18px rgba(0,240,255,0.25), inset 0 0 20px rgba(0,240,255,0.06)',
    transform: 'translateY(-1px)',
  },
  btnDisabled: {
    opacity: 0.28,
    cursor: 'not-allowed',
    border: '1px dashed rgba(255,255,255,0.1)',
    background: 'transparent',
    boxShadow: 'none',
  },
  btnText: {
    fontFamily: 'var(--font-title)',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 3,
    color: '#00F0FF',
    textShadow: '0 0 8px rgba(0,240,255,0.5)',
  },
  btnTextDisabled: {
    fontFamily: 'var(--font-title)',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.3)',
  },
  btnArrow: {
    position: 'absolute',
    right: 20,
    fontSize: 20,
    color: '#00F0FF',
    transition: 'opacity 0.18s ease',
  },

  version: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'rgba(255,255,255,0.18)',
    letterSpacing: 1,
  },
};
