import React from 'react';

interface EndGameLayoutProps {
  badge?: string;
  title: string;
  subtitle?: string;
  accentColor?: string;
  borderColor?: string;
  children: React.ReactNode;
  actions: React.ReactNode;
}

export default function EndGameLayout({
  badge,
  title,
  subtitle,
  accentColor = '#00F0FF',
  borderColor = 'rgba(0, 240, 255, 0.35)',
  children,
  actions,
}: EndGameLayoutProps) {
  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.card, borderColor }}>
        {badge && <div style={{ ...styles.badge, color: accentColor }}>{badge}</div>}
        <h1 style={{ ...styles.title, color: accentColor }}>{title}</h1>
        {subtitle && <p style={styles.sub}>{subtitle}</p>}
        {children}
        <div style={styles.actions}>{actions}</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(11, 19, 43, 0.92)',
    backdropFilter: 'blur(4px)',
    zIndex: 150,
  },
  card: {
    width: 'min(420px, 92vw)',
    padding: '28px 24px',
    borderRadius: 16,
    border: '1px solid',
    background: 'rgba(13, 27, 42, 0.98)',
    textAlign: 'center',
  },
  badge: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontFamily: 'var(--font-title)',
    fontSize: 26,
    margin: '0 0 8px',
    letterSpacing: 2,
  },
  sub: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    margin: '0 0 16px',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 16,
  },
};
