import React, { useEffect, useState } from 'react';
import { COLORS } from '../utils/colorPalette';
import type { LeaderboardEntry } from '../types/game.types';
import { getLeaderboard, subscribeToLeaderboard } from '../supabase/queries';

interface LeaderboardProps {
  onClose: () => void;
  currentPlayerScore?: number;
}

export default function Leaderboard({ onClose, currentPlayerScore }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'global' | 'weekly'>('global');

  useEffect(() => {
    setLoading(true);
    getLeaderboard(tab)
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));

    const unsubscribe = subscribeToLeaderboard(() => {
      getLeaderboard(tab).then(setEntries).catch(console.error);
    });

    return () => {
      unsubscribe();
    };
  }, [tab]);

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <div style={styles.title}>
            🏆 LEADERBOARD
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {(['global', 'weekly'] as const).map((t) => (
            <button
              key={t}
              style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
              onClick={() => setTab(t)}
            >
              {t === 'global' ? '🌍 ALL TIME' : '📅 THIS WEEK'}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div style={styles.loading}>
            <div style={{
              width: 24,
              height: 24,
              border: '2px solid rgba(0,255,65,0.2)',
              borderTopColor: COLORS.HUD_GOLD,
              borderRadius: '50%',
              animation: 'radarSweep 1s linear infinite',
              margin: '0 auto 12px',
            }} />
            LOADING RADAR DATA
          </div>
        ) : entries.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🛩️</div>
            <div style={{ color: COLORS.HUD_GOLD, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>
              NO ENTRIES YET
            </div>
            <div style={{ color: COLORS.HUD_DIM, fontSize: 10, letterSpacing: 1 }}>
              BE THE FIRST TO SECURE A RANKING
            </div>
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <div style={styles.tableHeader}>
              <span style={{ width: 36 }}>#</span>
              <span style={{ flex: 1 }}>CALLSIGN</span>
              <span style={{ width: 80, textAlign: 'right' }}>SCORE</span>
              <span style={{ width: 50, textAlign: 'right' }}>LVL</span>
            </div>
            {entries.map((e, i) => {
              const isTop3 = i < 3;
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div
                  key={`${e.rank}-${e.username}`}
                  style={{
                    ...styles.row,
                    background: isTop3 ? 'rgba(0,255,65,0.04)' : 'transparent',
                  }}
                >
                  <span style={{ width: 36, color: isTop3 ? COLORS.HUD_GOLD : COLORS.HUD_DIM }}>
                    {isTop3 ? medals[i] : `${i + 1}.`}
                  </span>
                  <span style={{ flex: 1, color: COLORS.HUD_TEXT }}>
                    {e.username}
                  </span>
                  <span style={{ width: 80, textAlign: 'right', color: isTop3 ? COLORS.HUD_GOLD : COLORS.HUD_TEXT, fontWeight: 'bold' }}>
                    {e.score.toLocaleString()}
                  </span>
                  <span style={{ width: 50, textAlign: 'right', color: COLORS.HUD_ACCENT }}>
                    {e.level_reached}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {currentPlayerScore !== undefined && (
          <div style={styles.yourScore}>
            YOUR SCORE: <strong style={{ color: COLORS.HUD_GOLD }}>{currentPlayerScore.toLocaleString()}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(11,19,43,0.9)',
    fontFamily: 'var(--font-mono)',
    backdropFilter: 'blur(3px)',
    zIndex: 50,
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    background: COLORS.BG_PANEL,
    border: '1px solid rgba(0,255,65,0.25)',
    borderRadius: 8,
    width: '90%',
    maxWidth: 460,
    maxHeight: '80vh',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    borderBottom: '1px solid rgba(0,255,65,0.15)',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.HUD_GOLD,
    letterSpacing: 2,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: COLORS.HUD_DIM,
    fontSize: 16,
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid rgba(0,255,65,0.1)',
  },
  tab: {
    flex: 1,
    padding: '8px 0',
    background: 'transparent',
    border: 'none',
    color: COLORS.HUD_DIM,
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    cursor: 'pointer',
    letterSpacing: 1,
  },
  tabActive: {
    color: COLORS.HUD_TEXT,
    background: 'rgba(0,255,65,0.06)',
    borderBottom: `2px solid ${COLORS.HUD_TEXT}`,
  },
  tableWrap: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  tableHeader: {
    display: 'flex',
    padding: '6px 18px',
    fontSize: 9,
    color: COLORS.HUD_DIM,
    letterSpacing: 2,
    borderBottom: '1px solid rgba(0,255,65,0.08)',
  },
  row: {
    display: 'flex',
    padding: '7px 18px',
    fontSize: 12,
    borderBottom: '1px solid rgba(0,255,65,0.04)',
    alignItems: 'center',
  },
  loading: {
    padding: 24,
    textAlign: 'center',
    color: COLORS.HUD_DIM,
    fontSize: 11,
    letterSpacing: 2,
  },
  emptyState: {
    padding: 32,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    fontFamily: 'var(--font-mono)',
  },
  yourScore: {
    padding: '10px 18px',
    borderTop: '1px solid rgba(0,255,65,0.15)',
    fontSize: 11,
    color: COLORS.HUD_DIM,
    letterSpacing: 1,
  },
};
