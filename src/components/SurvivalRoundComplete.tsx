import React from 'react';
import type { SurvivalState, PowerUp } from '../types/survival.types';

interface SurvivalRoundCompleteProps {
  state: SurvivalState;
  onSelectPowerUp: (powerUp: PowerUp) => void;
}

export default function SurvivalRoundComplete({ state, onSelectPowerUp }: SurvivalRoundCompleteProps) {
  const choices = state.pendingPowerUpChoices || [];

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.header}>ROUND {state.round} COMPLETE</div>
        <p style={styles.sub}>Quota met. Select a tactical advantage for the next round.</p>

        <div style={styles.cards}>
          {choices.map((pu) => (
            <button key={pu.id} style={styles.card} onClick={() => onSelectPowerUp(pu)}>
              <div style={styles.cardName}>{pu.name}</div>
              <div style={styles.cardDesc}>{pu.description}</div>
              <div style={styles.cardDuration}>
                {pu.durationMs === 0 ? 'INSTANT / ONE-TIME' : `${pu.durationMs / 1000} SECONDS`}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(11, 19, 43, 0.9)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    animation: 'fadeIn 0.3s ease-out',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    maxWidth: 600,
    width: '90%',
  },
  header: {
    fontFamily: 'var(--font-title)',
    fontSize: 32,
    fontWeight: 900,
    color: '#39FF14',
    letterSpacing: 4,
    textShadow: '0 0 20px rgba(57,255,20,0.5)',
  },
  sub: {
    fontFamily: 'var(--font-mono)',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  cards: {
    display: 'flex',
    gap: 16,
    width: '100%',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  card: {
    flex: '1 1 150px',
    background: 'rgba(255, 215, 0, 0.05)',
    border: '1px solid rgba(255, 215, 0, 0.3)',
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
  },
  cardName: {
    fontFamily: 'var(--font-title)',
    fontSize: 16,
    fontWeight: 800,
    color: '#FFD700',
    letterSpacing: 1,
  },
  cardDesc: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: '#FFF',
    lineHeight: 1.4,
  },
  cardDuration: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 'auto',
  },
};
