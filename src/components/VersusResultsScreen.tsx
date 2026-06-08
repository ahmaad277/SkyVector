import React from 'react';
import type { MatchEndResult } from '../engine/MultiplayerEngine';
import { resolvePlayerColor } from '../engine/MultiplayerEngine';
import type { RoomPlayer } from '../hooks/useMultiplayer';

interface VersusResultsScreenProps {
  result: MatchEndResult;
  players: RoomPlayer[];
  currentUserId: string;
  onLobby: () => void;
  onMenu: () => void;
}

export default function VersusResultsScreen({
  result,
  players,
  currentUserId,
  onLobby,
  onMenu,
}: VersusResultsScreenProps) {
  const sorted = [...players].sort(
    (a, b) => (result.playerScores[b.player_id] ?? 0) - (result.playerScores[a.player_id] ?? 0)
  );
  const winner = players.find((p) => p.player_id === result.winnerId);
  const isWinner = result.winnerId === currentUserId;

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.badge}>
          {result.reason === 'versus_time' ? 'TIME UP' : 'MATCH COMPLETE'}
        </div>
        <h1 style={{ ...styles.title, color: isWinner ? '#39FF14' : '#FF003C' }}>
          {isWinner ? 'VICTORY' : 'DEFEAT'}
        </h1>
        {winner && (
          <p style={styles.sub}>
            Winner: <span style={{ color: resolvePlayerColor(winner.color) }}>{winner.username}</span>
          </p>
        )}

        <div style={styles.list}>
          {sorted.map((p, i) => (
            <div key={p.id} style={styles.row}>
              <span style={{ color: resolvePlayerColor(p.color), fontWeight: 'bold' }}>#{i + 1} {p.username}</span>
              <span>{(result.playerScores[p.player_id] ?? 0).toLocaleString()} pts</span>
            </div>
          ))}
        </div>

        <div style={styles.buttons}>
          <button style={styles.btnPrimary} onClick={onLobby}>BACK TO LOBBY</button>
          <button style={styles.btnSecondary} onClick={onMenu}>MAIN MENU</button>
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
    background: 'rgba(11, 19, 43, 0.92)',
    zIndex: 150,
  },
  card: {
    width: 'min(420px, 92vw)',
    padding: 28,
    borderRadius: 16,
    border: '1px solid rgba(255, 215, 0, 0.35)',
    background: 'rgba(13, 27, 42, 0.98)',
    textAlign: 'center',
  },
  badge: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: 2,
    color: '#FFD700',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'var(--font-title)',
    fontSize: 28,
    margin: '0 0 8px',
    letterSpacing: 3,
  },
  sub: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 20,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 20,
    textAlign: 'left',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.05)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: '#fff',
  },
  buttons: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  btnPrimary: {
    padding: 12,
    borderRadius: 8,
    border: '1px solid rgba(0,240,255,0.5)',
    background: 'rgba(0,240,255,0.12)',
    color: '#00F0FF',
    fontFamily: 'var(--font-title)',
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: 12,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'var(--font-title)',
    cursor: 'pointer',
  },
};
