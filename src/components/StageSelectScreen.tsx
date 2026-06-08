import React, { useState } from 'react';
import { LEVELS } from '../levels';
import ScreenHeader from './shared/ScreenHeader';
import GridBackground from './shared/GridBackground';

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
  '#39FF14',
  '#00F0FF',
  '#39FF14',
  '#FFA500',
  '#FF003C',
  '#FFA500',
  '#FF003C',
  '#FFD700',
];

export default function StageSelectScreen({
  onStartLevel,
  onBack,
  unlockedLevel,
}: StageSelectScreenProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <div style={styles.root}>
      <GridBackground accentColor="#00F0FF" opacity={0.025} />

      <ScreenHeader
        title="STAGE SELECT"
        subtitle={`${unlockedLevel} / ${LEVELS.length} UNLOCKED`}
        accentColor="#00F0FF"
        onBack={onBack}
      />

      <div style={styles.scrollArea}>
        <div style={styles.grid}>
          {LEVELS.map((lvl) => {
            const locked = lvl.id > unlockedLevel;
            const accent = levelAccentColors[lvl.id - 1] ?? '#39FF14';
            const isHovered = hoveredId === lvl.id && !locked;

            return (
              <button
                key={lvl.id}
                aria-label={`Level ${lvl.id}: ${lvl.name}${locked ? ' (Locked)' : ''}`}
                aria-disabled={locked}
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
                <div style={{
                  ...styles.lvlBadge,
                  color: locked ? 'rgba(255,255,255,0.25)' : accent,
                  textShadow: locked ? 'none' : `0 0 8px ${accent}88`,
                }}>
                  LVL {lvl.id}
                </div>

                <div style={{
                  ...styles.lvlName,
                  color: locked ? 'rgba(255,255,255,0.2)' : '#FFFFFF',
                }}>
                  {lvl.name}
                </div>

                <div style={styles.lvlSub}>
                  {lvl.subtitle}
                </div>

                {!locked && (
                  <div style={{
                    ...styles.accentBar,
                    background: accent,
                    opacity: isHovered ? 0.7 : 0.3,
                  }} />
                )}

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
    background: 'transparent',
    overflow: 'hidden',
    paddingTop: 'env(safe-area-inset-top)',
    paddingBottom: 'env(safe-area-inset-bottom)',
    animation: 'fadeIn 0.3s ease both',
  },
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
