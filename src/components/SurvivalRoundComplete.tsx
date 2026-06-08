import React from 'react';
import type { PowerUp } from '../types/survival.types';

interface SurvivalRoundCompleteProps {
  round: number;
  choices: PowerUp[];
  onSelect: (powerUp: PowerUp) => void;
}

export default function SurvivalRoundComplete({ round, choices, onSelect }: SurvivalRoundCompleteProps) {
  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.badge}>ROUND {round - 1} CLEARED</div>
        <h2 style={styles.title}>SELECT POWER-UP</h2>
        <p style={styles.subtitle}>Choose one upgrade for the next round</p>

        <div style={styles.choices}>
          {choices.map((choice) => (
            <button
              key={choice.id}
              style={styles.choiceBtn}
              onClick={() => onSelect(choice)}
            >
              <div style={styles.choiceName}>{choice.name}</div>
              <div style={styles.choiceDesc}>{choice.description}</div>
            </button>
          ))}
        </div>
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
    background: 'rgba(11, 19, 43, 0.88)',
    backdropFilter: 'blur(6px)',
    zIndex: 200,
  },
  card: {
    width: 'min(420px, 92vw)',
    padding: '28px 24px',
    borderRadius: 16,
    border: '1px solid rgba(255, 0, 60, 0.4)',
    background: 'linear-gradient(180deg, rgba(28, 37, 65, 0.98) 0%, rgba(11, 19, 43, 0.98) 100%)',
    boxShadow: '0 0 40px rgba(255, 0, 60, 0.2)',
    textAlign: 'center',
  },
  badge: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: 2,
    color: '#39FF14',
    marginBottom: 8,
  },
  title: {
    margin: '0 0 8px',
    fontFamily: 'var(--font-title)',
    fontSize: 22,
    color: '#FF003C',
    letterSpacing: 2,
  },
  subtitle: {
    margin: '0 0 20px',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  choices: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  choiceBtn: {
    textAlign: 'left',
    padding: '14px 16px',
    borderRadius: 10,
    border: '1px solid rgba(0, 240, 255, 0.25)',
    background: 'rgba(0, 240, 255, 0.06)',
    cursor: 'pointer',
    transition: 'transform 0.15s, border-color 0.15s',
  },
  choiceName: {
    fontFamily: 'var(--font-title)',
    fontSize: 14,
    color: '#00F0FF',
    marginBottom: 4,
    letterSpacing: 1,
  },
  choiceDesc: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 1.4,
  },
};
