import React, { useState } from 'react';
import { COLORS } from '../utils/colorPalette';
import { LEVELS } from '../levels';

interface StageSelectScreenProps {
  onStartLevel: (level: number) => void;
  onBack: () => void;
  unlockedLevel: number;
}

const LockIcon = () => (
  <svg width="14" height="16" viewBox="0 0 14 16" fill="none" aria-hidden="true">
    <rect x="2" y="7" width="10" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M4 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <circle cx="7" cy="12" r="1.2" fill="currentColor" />
  </svg>
);

const levelAccentColors = [
  '#39FF14', // 1 — green
  '#00F0FF', // 2 — cyan
  '#39FF14', // 3
  '#FFA500', // 4 — orange (IFR)
  '#FF003C', // 5 — red (Storm)
  '#FFA500', // 6
  '#FF003C', // 7 — Emergency
  '#FFD700', // 8 — gold (Midnight)
];

export default function StageSelectScreen({
  onStartLevel,
  onBack,
  unlockedLevel,
}: StageSelectScreenProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <div style={styles.root}>
      {/* Subtle grid background */}
      <div style={styles.gridBg} aria-hidden="true" />

      {/* Fixed header */}
      <div style={styles.header}>
        <button
          style={styles.backBtn}
          onClick={onBack}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#00F0FF')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(0,240,255,0.55)')}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 14L6 9l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          BACK
        </button>

        <div style={styles.headerTitle}>
          <span style={styles.headerTitleText}>STAGE SELECT</span>
          <span style={styles.headerTitleSub}>{unlockedLevel} / {LEVELS.length} UNLOCKED</span>
        </div>

        <div style={{ width: 72 }} />
      </div>

      {/* Scrollable level grid */}
      <div style={styles.scrollArea}>
        <div style={styles.grid}>
          {LEVELS.map((lvl) => {
            const locked = lvl.id > unlockedLevel;
            const accent = levelAccentColors[lvl.id - 1] ?? '#39FF14';
            const isHovered = hoveredId === lvl.id && !locked;

            return (
              <button
                key={lvl.id}
                style={{
                  ...styles.card,
                  ...(locked ? styles.cardLocked : {}),
                  ...(isHovered ? {
                    ...styles.cardHover,
                    borderColor: `${accent}55`,
                    boxShadow: `0 0 20px ${accent}22, 0 6px 30px rgba(0,0,0,0.5)`,
                  } : {}),
                  ...(!locked && lvl.id === 1 ? styles.cardFeatured : {}),
                }}
                disabled={locked}
                onClick={() => !locked && onStartLevel(lvl.id)}
                onMouseEnter={() => setHoveredId(lvl.id)}
                onMouseLeave={() => setHoveredId(null)}
                onTouchStart={() => setHoveredId(lvl.id)}
                onTouchEnd={() => setHoveredId(null)}
              >
                {/* Level number badge */}
                <div style={{
                  ...styles.lvlBadge,
                  color: locked ? 'rgba(255,255,255,0.25)' : accent,
                  textShadow: locked ? 'none' : `0 0 8px ${accent}88`,
                }}>
                  LVL {lvl.id}
                </div>

                {/* Level name */}
                <div style={{
                  ...styles.lvlName,
                  color: locked ? 'rgba(255,255,255,0.2)' : '#FFFFFF',
                }}>
                  {lvl.name}
                </div>

                {/* Subtitle */}
                <div style={styles.lvlSub}>
                  {lvl.subtitle}
                </div>

                {/* Accent bar at bottom */}
                {!locked && (
                  <div style={{
                    ...styles.accentBar,
                    background: accent,
                    opacity: isHovered ? 0.7 : 0.3,
                  }} />
                )}

                {/* Lock overlay */}
                {locked && (
                  <div style={styles.lockOverlay}>
                    <LockIcon />
                  </div>
                )}
              </button>
            );
          })}
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
      linear-gradient(rgba(0,240,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,240,255,0.025) 1px, transparent 1px)
    `,
    backgroundSize: '48px 48px',
    pointerEvents: 'none',
  },

  // ── Header ──
  header: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px 12px',
    borderBottom: '1px solid rgba(0,240,255,0.08)',
    background: 'rgba(11, 19, 37, 0.85)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    flexShrink: 0,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'var(--font-title)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2,
    color: 'rgba(0,240,255,0.55)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: 6,
    transition: 'color 0.15s ease',
    width: 72,
  },
  headerTitle: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  headerTitleText: {
    fontFamily: 'var(--font-title)',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 4,
    color: '#00F0FF',
    textShadow: '0 0 12px rgba(0,240,255,0.5)',
  },
  headerTitleSub: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'rgba(0,240,255,0.4)',
    letterSpacing: 1,
  },

  // ── Scroll area ──
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '20px 16px 32px',
    position: 'relative',
    zIndex: 1,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
    maxWidth: 500,
    margin: '0 auto',
  },

  // ── Level card ──
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '18px 16px 22px',
    background: 'rgba(13, 27, 42, 0.75)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(57, 255, 20, 0.18)',
    borderRadius: 14,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.18s ease',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    overflow: 'hidden',
  },
  cardLocked: {
    background: 'rgba(13, 27, 42, 0.35)',
    border: '1px dashed rgba(255,255,255,0.08)',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  cardHover: {
    background: 'rgba(13, 27, 42, 0.9)',
    transform: 'translateY(-2px)',
  },
  cardFeatured: {
    border: '1px solid rgba(57,255,20,0.4)',
    boxShadow: '0 0 24px rgba(57,255,20,0.12), 0 6px 24px rgba(0,0,0,0.5)',
  },

  lvlBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 2,
    marginBottom: 6,
  },
  lvlName: {
    fontFamily: 'var(--font-mono)',
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.2,
    marginBottom: 6,
  },
  lvlSub: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'rgba(255,255,255,0.38)',
    lineHeight: 1.35,
  },
  accentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: '0 0 14px 14px',
    transition: 'opacity 0.18s ease',
  },
  lockOverlay: {
    position: 'absolute',
    top: 14,
    right: 14,
    color: 'rgba(255,255,255,0.2)',
  },
};
