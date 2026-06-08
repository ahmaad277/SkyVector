import React, { useState } from 'react';
import SettingsModal from './SettingsModal';

interface MainMenuProps {
  onContinue: () => void;
  onNewGame: () => void;
  onSurvival: () => void;
  onOnline: () => void;
  onLeaderboard: () => void;
  onUnlockAllStages: () => void;
  onLockAllStages: () => void;
  onResetProgress: () => void;
  highScore: number;
  canContinue: boolean;
  unlockedLevel: number;
}

export default function MainMenu({
  onContinue,
  onNewGame,
  onSurvival,
  onOnline,
  onLeaderboard,
  onUnlockAllStages,
  onLockAllStages,
  onResetProgress,
  highScore,
  canContinue,
  unlockedLevel,
}: MainMenuProps) {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const buttons = [
    { id: 'continue',    label: 'CONTINUE',    action: onContinue,    disabled: !canContinue },
    { id: 'newgame',     label: 'NEW GAME',     action: onNewGame,     disabled: false },
    { id: 'survival',    label: 'SURVIVAL MODE', action: onSurvival,    disabled: false, isSpecial: true },
    { id: 'online',      label: 'ONLINE MULTIPLAYER', action: onOnline, disabled: false },
    { id: 'leaderboard', label: 'LEADERBOARD',  action: onLeaderboard, disabled: false },
    { id: 'settings',    label: 'SETTINGS',     action: () => setSettingsOpen(true), disabled: false },
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
          {buttons.map(({ id, label, action, disabled, isSpecial }) => {
            const isHovered = hoveredBtn === id && !disabled;
            return (
              <button
                key={id}
                style={{
                  ...styles.btn,
                  ...(disabled ? styles.btnDisabled : {}),
                  ...(isHovered ? (isSpecial ? styles.btnHoverSpecial : styles.btnHover) : {}),
                  ...(isSpecial ? styles.btnSpecial : {}),
                }}
                onClick={action}
                disabled={disabled}
                onMouseEnter={() => setHoveredBtn(id)}
                onMouseLeave={() => setHoveredBtn(null)}
                onTouchStart={() => setHoveredBtn(id)}
                onTouchEnd={() => setHoveredBtn(null)}
              >
                <span style={disabled ? styles.btnTextDisabled : (isSpecial ? styles.btnTextSpecial : styles.btnText)}>
                  {label}
                </span>
                {!disabled && (
                  <span style={{ ...(isSpecial ? styles.btnArrowSpecial : styles.btnArrow), opacity: isHovered ? 1 : 0 }}>
                    ›
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={styles.version}>v1.0 · SKYVECTOR</div>
      </div>

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          onUnlockAllStages={onUnlockAllStages}
          onLockAllStages={onLockAllStages}
          onResetProgress={onResetProgress}
          unlockedLevel={unlockedLevel}
        />
      )}

      {/* Developer Info */}
      <div style={styles.developerInfo}>
        <div style={styles.developerName}>أحمد غرم الله أحمد الزهراني</div>
        <div>0534897272</div>
        <div>Ahmaaad277@gmail.com</div>
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
    background: 'transparent',
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
    gap: 20,
    padding: '36px 28px 24px',
    background: 'rgba(13, 27, 42, 0.72)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(0, 240, 255, 0.15)',
    borderRadius: 20,
    maxWidth: 380,
    width: '92%',
    overflow: 'hidden',
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
    fontSize: 'clamp(26px, 9.5vw, 44px)',
    fontWeight: 900,
    letterSpacing: 1,
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
    fontFamily: 'var(--font-mono)',
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
  btnSpecial: {
    background: 'rgba(255, 0, 60, 0.08)',
    border: '1px solid rgba(255, 0, 60, 0.4)',
    boxShadow: 'inset 0 0 16px rgba(255,0,60,0.05)',
  },
  btnHoverSpecial: {
    background: 'rgba(255, 0, 60, 0.15)',
    border: '1px solid rgba(255, 0, 60, 0.8)',
    boxShadow: '0 0 20px rgba(255,0,60,0.4), inset 0 0 20px rgba(255,0,60,0.1)',
    transform: 'translateY(-1px)',
  },
  btnTextSpecial: {
    fontFamily: 'var(--font-title)',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 3,
    color: '#FF003C',
    textShadow: '0 0 10px rgba(255,0,60,0.6)',
  },
  btnArrowSpecial: {
    position: 'absolute',
    right: 20,
    fontSize: 20,
    color: '#FF003C',
    transition: 'opacity 0.18s ease',
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
  modalBackdrop: {
    position: 'absolute',
    inset: 0,
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  settingsModal: {
    width: 'min(360px, 92vw)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 22,
    background: 'rgba(13, 27, 42, 0.94)',
    border: '1px solid rgba(0,240,255,0.28)',
    borderRadius: 16,
    boxShadow: '0 18px 50px rgba(0,0,0,0.65), 0 0 24px rgba(0,240,255,0.12)',
  },
  settingsTitle: {
    fontFamily: 'var(--font-title)',
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 3,
    color: '#00F0FF',
    textAlign: 'center',
  },
  settingsText: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: 1,
    lineHeight: 1.4,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
  },
  passwordInput: {
    fontFamily: 'var(--font-mono)',
    fontSize: 16,
    color: '#FFFFFF',
    background: 'rgba(0,240,255,0.06)',
    border: '1px solid rgba(0,240,255,0.28)',
    borderRadius: 10,
    outline: 'none',
    padding: '12px 14px',
    textAlign: 'center',
  },
  settingsMessage: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.5,
    textAlign: 'center',
    minHeight: 14,
  },
  settingsActions: {
    display: 'flex',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    fontFamily: 'var(--font-title)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.62)',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 10,
    padding: '12px 10px',
    cursor: 'pointer',
  },
  primaryBtn: {
    flex: 1,
    fontFamily: 'var(--font-title)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    color: '#06121D',
    background: '#00F0FF',
    border: '1px solid rgba(0,240,255,0.8)',
    borderRadius: 10,
    padding: '12px 10px',
    cursor: 'pointer',
    boxShadow: '0 0 18px rgba(0,240,255,0.35)',
  },
  developerInfo: {
    position: 'absolute',
    bottom: 'calc(env(safe-area-inset-bottom) + 6px)',
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    lineHeight: 1.2,
    fontFamily: 'var(--font-mono)',
    fontSize: 'clamp(9px, 2.5vw, 11px)',
    color: 'rgba(255, 255, 255, 0.4)',
    pointerEvents: 'none',
    zIndex: 1,
    textAlign: 'center',
  },
  developerName: {
    wordSpacing: '-2px',
    letterSpacing: '-0.3px',
  },
};
