import React from 'react';
import { COLORS } from '../utils/colorPalette';

import { LEVELS } from '../levels';

interface LevelCompleteScreenProps {
  level: number;
  stats: {
    perfectLandings: number;
    fastestLanding: number;
    totalTimeBonuses: number;
  };
  onNextLevel: () => void;
  onMenu: () => void;
}

export default function LevelCompleteScreen({ level, stats, onNextLevel, onMenu }: LevelCompleteScreenProps) {
  const isFinalLevel = level >= LEVELS.length;

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.glitchText}>STAGE CLEARED</div>
        
        <h2 style={styles.levelText}>SECTOR {level} SECURED</h2>
        
        <p style={styles.message}>
          {isFinalLevel 
            ? "Congratulations! You have completed all sectors."
            : "Airspace secured. Get ready for the next sector."}
        </p>

        <div style={styles.statsGrid}>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>PERFECT LANDINGS</div>
            <div style={styles.statValue}>{stats.perfectLandings}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>FASTEST LANDING</div>
            <div style={styles.statValue}>{stats.fastestLanding === Infinity ? '--' : `${(stats.fastestLanding / 1000).toFixed(1)}s`}</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>TIME BONUS PTS</div>
            <div style={styles.statValue}>+{stats.totalTimeBonuses}</div>
          </div>
        </div>

        <div style={styles.buttons}>
          {!isFinalLevel && (
            <button style={styles.btnPrimary} onClick={onNextLevel}>
              NEXT STAGE
            </button>
          )}
          <button style={styles.btnSecondary} onClick={onMenu}>
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(11, 19, 43, 0.85)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    animation: 'fadeIn 0.3s ease-out',
  },
  container: {
    background: 'linear-gradient(180deg, rgba(28, 37, 65, 0.95) 0%, rgba(11, 19, 43, 0.95) 100%)',
    border: `2px solid ${COLORS.HUD_ACCENT}`,
    borderRadius: 16,
    padding: '40px',
    textAlign: 'center',
    maxWidth: 400,
    width: '90%',
    boxShadow: `0 0 30px ${COLORS.HUD_ACCENT}40, inset 0 0 20px rgba(255,255,255,0.05)`,
  },
  glitchText: {
    fontFamily: '"JetBrains Mono", "Courier New", monospace',
    fontSize: '2rem',
    fontWeight: 900,
    color: '#00FF41',
    letterSpacing: 4,
    marginBottom: 8,
    textShadow: '0 0 10px rgba(0, 255, 65, 0.5)',
  },
  levelText: {
    margin: '0 0 20px 0',
    color: COLORS.HUD_TEXT,
    fontSize: '1.4rem',
    letterSpacing: 2,
  },
  message: {
    color: COLORS.HUD_DIM,
    fontSize: '1rem',
    lineHeight: 1.5,
    marginBottom: 20,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginBottom: 30,
  },
  statBox: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(0, 240, 255, 0.2)',
    borderRadius: 8,
    padding: '12px 8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: '0.7rem',
    color: COLORS.HUD_DIM,
    marginBottom: 4,
    letterSpacing: 1,
  },
  statValue: {
    fontSize: '1.2rem',
    color: '#00F0FF',
    fontWeight: 'bold',
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  btnPrimary: {
    padding: '16px',
    background: `linear-gradient(90deg, ${COLORS.HUD_ACCENT} 0%, #0077b6 100%)`,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: 2,
    boxShadow: '0 4px 15px rgba(0,180,216,0.4)',
    transition: 'all 0.2s',
  },
  btnSecondary: {
    padding: '14px',
    background: 'rgba(255, 255, 255, 0.05)',
    color: COLORS.HUD_TEXT,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: 1,
    transition: 'all 0.2s',
  }
};
