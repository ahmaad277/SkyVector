import React from 'react';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  onBack: () => void;
}

export default function ScreenHeader({ title, subtitle, accentColor = '#00F0FF', onBack }: ScreenHeaderProps) {
  return (
    <div style={styles.header}>
      <button
        onClick={onBack}
        aria-label="Back"
        style={{ ...styles.backBtn, color: accentColor, borderColor: accentColor }}
      >
        <BackArrow color={accentColor} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 1 }}>BACK</span>
      </button>
      <div style={styles.headerCenter}>
        <div style={{ ...styles.title, color: accentColor, textShadow: `0 0 20px ${accentColor}40` }}>
          {title}
        </div>
        {subtitle && <div style={styles.subtitle}>{subtitle}</div>}
      </div>
      <div style={styles.spacer} />
    </div>
  );
}

function BackArrow({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M7.5 1L2.5 6L7.5 11" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 600,
    paddingBottom: 4,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid',
    borderRadius: 20,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'var(--font-mono)',
  },
  headerCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontFamily: 'var(--font-title)',
    fontSize: 'clamp(20px, 6vw, 28px)',
    fontWeight: 900,
    letterSpacing: 3,
    lineHeight: 1,
  },
  subtitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1,
  },
  spacer: {
    width: 80,
  },
};
