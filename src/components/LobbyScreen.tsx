import React, { useState } from 'react';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { requiresMinTwoPlayers } from '../engine/MultiplayerEngine';

interface LobbyScreenProps {
  multiplayer: ReturnType<typeof useMultiplayer>;
  onBack: () => void;
  onStartGame: () => void;
  currentUserId: string;
}

export default function LobbyScreen({ multiplayer, onBack, onStartGame, currentUserId }: LobbyScreenProps) {
  const { room, players, updateReadyStatus, startGame, leaveRoom } = multiplayer;
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const isHost = room.host_id === currentUserId;
  const me = players.find(p => p.player_id === currentUserId);
  const allReady = players.every(p => p.is_ready);
  const needsTwo = requiresMinTwoPlayers(room.mode);
  const canStart = allReady && (!needsTwo || players.length >= 2);

  const handleLeave = () => {
    leaveRoom();
    onBack();
  };

  const handleReadyToggle = () => {
    if (me) {
      updateReadyStatus(!me.is_ready);
    }
  };

  const handleStart = () => {
    if (isHost && canStart) {
      startGame();
      onStartGame();
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
    } catch {
      // Fallback for insecure contexts
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>ROOM: <span style={{ color: '#FFF' }}>{room.code}</span></h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={handleCopyCode}
              style={{
                ...styles.copyBtn,
                background: copied ? 'rgba(57,255,20,0.15)' : 'rgba(0,240,255,0.1)',
                borderColor: copied ? 'rgba(57,255,20,0.4)' : 'rgba(0,240,255,0.3)',
                color: copied ? '#39FF14' : '#00F0FF',
              }}
              aria-label="Copy room code"
            >
              {copied ? '✓ COPIED' : '📋 COPY'}
            </button>
            <div style={styles.modeBadge}>{room.mode.replace('_', ' ').toUpperCase()}</div>
          </div>
        </div>

        <div style={styles.playersList}>
          {players.map(p => (
            <div key={p.id} style={{
              ...styles.playerRow,
              borderLeft: `4px solid ${p.color}`,
              background: p.player_id === currentUserId ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.3)'
            }}>
              <div style={styles.playerInfo}>
                <span style={{ color: p.color, fontWeight: 'bold' }}>{p.username}</span>
                {p.player_id === room.host_id && <span style={styles.hostBadge}>HOST</span>}
              </div>
              <div style={{
                ...styles.readyBadge,
                color: p.is_ready ? '#39FF14' : 'rgba(255,255,255,0.5)',
                borderColor: p.is_ready ? '#39FF14' : 'rgba(255,255,255,0.2)',
              }}>
                {p.is_ready ? 'READY' : 'WAITING'}
              </div>
            </div>
          ))}
          {Array.from({ length: room.max_players - players.length }).map((_, i) => (
            <div key={i} style={{ ...styles.playerRow, background: 'rgba(0,0,0,0.1)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>EMPTY SLOT</span>
            </div>
          ))}
        </div>

        {needsTwo && players.length < 2 && (
          <div style={styles.hint}>Squad and Versus require at least 2 players.</div>
        )}

        <div style={styles.actions}>
          <button style={styles.secondaryBtn} onClick={handleLeave}>
            LEAVE ROOM
          </button>
          
          {isHost ? (
            <button 
              style={{
                ...styles.primaryBtn,
                opacity: canStart ? 1 : 0.5,
                cursor: canStart ? 'pointer' : 'not-allowed'
              }} 
              onClick={handleStart}
              disabled={!canStart}
            >
              START GAME
            </button>
          ) : (
            <button 
              style={{
                ...styles.primaryBtn,
                background: me?.is_ready ? 'rgba(57, 255, 20, 0.15)' : 'rgba(0, 240, 255, 0.15)',
                borderColor: me?.is_ready ? '#39FF14' : '#00F0FF',
                color: me?.is_ready ? '#39FF14' : '#00F0FF',
              }} 
              onClick={handleReadyToggle}
            >
              {me?.is_ready ? 'CANCEL READY' : 'READY UP'}
            </button>
          )}
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
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    zIndex: 100,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    padding: '30px',
    background: 'rgba(13, 27, 42, 0.95)',
    border: '1px solid rgba(0, 240, 255, 0.3)',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    paddingBottom: 16,
  },
  title: {
    fontFamily: 'var(--font-title)',
    fontSize: 24,
    color: '#00F0FF',
    margin: 0,
    letterSpacing: 2,
  },
  modeBadge: {
    background: 'rgba(0, 240, 255, 0.1)',
    border: '1px solid #00F0FF',
    color: '#00F0FF',
    padding: '4px 8px',
    borderRadius: 4,
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    fontWeight: 'bold',
  },
  copyBtn: {
    padding: '4px 10px',
    borderRadius: 4,
    border: '1px solid',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: 1,
    transition: 'all 0.2s',
  },
  playersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minHeight: 200,
  },
  playerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: 6,
    fontFamily: 'var(--font-mono)',
    fontSize: 14,
  },
  playerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  hostBadge: {
    background: 'rgba(255, 215, 0, 0.15)',
    color: '#FFD700',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
  },
  readyBadge: {
    border: '1px solid',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 'bold',
  },
  hint: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: '#FFD700',
    textAlign: 'center',
    padding: '8px 12px',
    background: 'rgba(255,215,0,0.08)',
    borderRadius: 6,
    border: '1px solid rgba(255,215,0,0.25)',
  },
  actions: {
    display: 'flex',
    gap: 16,
    marginTop: 10,
  },
  primaryBtn: {
    flex: 2,
    background: 'rgba(0,240,255,0.15)',
    border: '1px solid rgba(0,240,255,0.5)',
    color: '#00F0FF',
    padding: '12px 16px',
    borderRadius: 6,
    fontFamily: 'var(--font-title)',
    fontSize: 14,
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: 1,
    transition: 'all 0.2s',
  },
  secondaryBtn: {
    flex: 1,
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.6)',
    padding: '12px 16px',
    borderRadius: 6,
    fontFamily: 'var(--font-title)',
    fontSize: 12,
    cursor: 'pointer',
  },
};
