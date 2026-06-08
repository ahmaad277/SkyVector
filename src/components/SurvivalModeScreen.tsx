import React from 'react';
import ScreenHeader from './shared/ScreenHeader';
import GridBackground from './shared/GridBackground';
import Button from './shared/Button';

interface SurvivalModeScreenProps {
  onStart: () => void;
  onBack: () => void;
}

export default function SurvivalModeScreen({ onStart, onBack }: SurvivalModeScreenProps) {
  const bestRound = parseInt(localStorage.getItem('skyvector_survival_best_round') ?? '0', 10);
  const bestScore = parseInt(localStorage.getItem('skyvector_survival_best_score') ?? '0', 10);

  return (
    <div style={styles.root}>
      <GridBackground accentColor="#FF003C" opacity={0.03} />

      <ScreenHeader
        title="SURVIVAL MODE"
        accentColor="#FF003C"
        onBack={onBack}
      />

      <div style={styles.content}>
        <div style={styles.card}>
          <div style={styles.icon}>⚠️</div>
          <h1 style={styles.title}>ENDLESS OPERATIONS</h1>
          <p style={styles.desc}>
            Manage increasingly difficult waves of aircraft. Meet the landing quota before time runs out to advance to the next round.
          </p>

          <div style={styles.features}>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>❤️</span>
              <div>
                <div style={styles.featureTitle}>HEALTH SYSTEM</div>
                <div style={styles.featureDesc}>Start with 10 health. Collisions (-2), fuel exhaustion (-1), and delays (-1) reduce health.</div>
              </div>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>⚡</span>
              <div>
                <div style={styles.featureTitle}>POWER-UPS</div>
                <div style={styles.featureDesc}>Clear each round to pick 1 of 3 upgrades. Type streaks and combo x5 grant bonus buffs.</div>
              </div>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>🌪️</span>
              <div>
                <div style={styles.featureTitle}>ESCALATING HAZARDS</div>
                <div style={styles.featureDesc}>Face wind shear, radar sweeps, and bird strikes in later rounds.</div>
              </div>
            </div>
          </div>

          {(bestRound > 0 || bestScore > 0) && (
            <div style={styles.records}>
              {bestRound > 0 && <span>BEST ROUND: {bestRound}</span>}
              {bestScore > 0 && <span>BEST SCORE: {bestScore.toLocaleString()}</span>}
            </div>
          )}

          <Button
            variant="danger"
            fullWidth
            onClick={onStart}
            style={{
              padding: 'clamp(12px, 3vw, 16px)',
              background: 'linear-gradient(90deg, #FF003C 0%, #990024 100%)',
              border: 'none',
              boxShadow: '0 4px 20px rgba(255,0,60,0.4)',
            }}
          >
            COMMENCE OPERATIONS
          </Button>
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
  content: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 20px 40px',
    position: 'relative',
    zIndex: 1,
    overflowY: 'auto',
  },
  card: {
    background: 'rgba(13, 27, 42, 0.85)',
    border: '1px solid rgba(255,0,60,0.3)',
    borderRadius: 16,
    padding: 'clamp(16px, 4vw, 32px)',
    maxWidth: 480,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'clamp(12px, 3vw, 24px)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(255,0,60,0.1)',
    margin: 'auto',
  },
  icon: {
    fontSize: 'clamp(32px, 8vw, 48px)',
    filter: 'drop-shadow(0 0 10px rgba(255,0,60,0.5))',
  },
  title: {
    fontFamily: 'var(--font-title)',
    fontSize: 'clamp(18px, 5vw, 24px)',
    fontWeight: 800,
    color: '#FFF',
    margin: 0,
    letterSpacing: 2,
    textAlign: 'center',
  },
  desc: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'clamp(11px, 3vw, 13px)',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 1.5,
    margin: 0,
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(8px, 2vw, 16px)',
    width: '100%',
    background: 'rgba(0,0,0,0.2)',
    padding: 'clamp(12px, 3vw, 20px)',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  feature: {
    display: 'flex',
    gap: 'clamp(8px, 2vw, 16px)',
    alignItems: 'flex-start',
  },
  featureIcon: {
    fontSize: 'clamp(16px, 4vw, 20px)',
  },
  featureTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'clamp(10px, 2.5vw, 12px)',
    fontWeight: 700,
    color: '#FF003C',
    letterSpacing: 1,
    marginBottom: 4,
  },
  featureDesc: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'clamp(9px, 2.5vw, 11px)',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.4,
  },
  records: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,215,0,0.25)',
    background: 'rgba(255,215,0,0.06)',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: '#FFD700',
    textAlign: 'center',
  },
};
