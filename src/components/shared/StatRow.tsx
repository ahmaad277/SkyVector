import React from 'react';

interface StatRowProps {
  label: string;
  value: string;
  highlight?: boolean;
  variant?: 'gold' | 'red';
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  label: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
  },
  value: {
    fontFamily: 'var(--font-mono)',
    fontWeight: 'bold',
    color: '#FFF',
    fontSize: 20,
  },
  valueHighlight: {
    color: '#FFD700',
    fontSize: 28,
  },
  valueRed: {
    color: '#FF003C',
    fontSize: 24,
  },
};

export default function StatRow({ label, value, highlight, variant }: StatRowProps) {
  return (
    <div style={styles.row}>
      <span style={styles.label}>{label}</span>
      <span style={{
        ...styles.value,
        ...(highlight ? styles.valueHighlight : {}),
        ...(variant === 'red' ? styles.valueRed : {}),
      }}>
        {value}
      </span>
    </div>
  );
}
