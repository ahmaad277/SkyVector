import React, { useState } from 'react';
import { useMultiplayer, type MultiplayerMode } from '../hooks/useMultiplayer';

interface OnlineMenuProps {
  onBack: () => void;
  username: string;
}

export default function OnlineMenu({ onBack, username }: OnlineMenuProps) {
  const { createRoom, joinRoom, loading, error } = useMultiplayer();
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<MultiplayerMode>('coop_shared');
  const level = 1; // Default level for now

  const handleCreate = () => {
    createRoom(username, mode, level);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim().length === 6) {
      joinRoom(joinCode.trim(), username);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <h1 style={styles.title}>ONLINE MULTIPLAYER</h1>
        
        {error && <div style={styles.error}>{error}</div>}
        
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>CREATE ROOM</h2>
          <div style={styles.row}>
            <label style={styles.label}>MODE</label>
            <select 
              value={mode} 
              onChange={(e) => setMode(e.target.value as MultiplayerMode)}
              style={styles.select}
            >
              <option value="coop_shared">SHARED CO-OP</option>
              <option value="coop_squad">SQUAD CO-OP</option>
              <option value="versus">VERSUS</option>
            </select>
          </div>
          <button 
            style={styles.primaryBtn} 
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? 'CREATING...' : 'CREATE ROOM'}
          </button>
        </div>

        <div style={styles.divider} />

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>JOIN ROOM</h2>
          <form onSubmit={handleJoin} style={{ display: 'flex', gap: 8 }}>
            <input
              style={styles.input}
              type="text"
              placeholder="ENTER 6-DIGIT CODE"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button 
              type="submit" 
              style={styles.primaryBtn}
              disabled={loading || joinCode.length !== 6}
            >
              JOIN
            </button>
          </form>
        </div>

        <button style={styles.secondaryBtn} onClick={onBack}>
          BACK TO MENU
        </button>
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
    maxWidth: 400,
    boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
  },
  title: {
    fontFamily: 'var(--font-title)',
    fontSize: 20,
    color: '#00F0FF',
    textAlign: 'center',
    margin: 0,
    letterSpacing: 2,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: '#FFF',
  },
  select: {
    background: 'rgba(0,0,0,0.5)',
    border: '1px solid rgba(0,240,255,0.3)',
    color: '#00F0FF',
    padding: '6px 10px',
    borderRadius: 4,
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    outline: 'none',
  },
  input: {
    flex: 1,
    background: 'rgba(0,0,0,0.5)',
    border: '1px solid rgba(0,240,255,0.3)',
    color: '#FFF',
    padding: '8px 12px',
    borderRadius: 4,
    fontFamily: 'var(--font-mono)',
    fontSize: 14,
    textAlign: 'center',
    outline: 'none',
    letterSpacing: 2,
  },
  primaryBtn: {
    background: 'rgba(0,240,255,0.15)',
    border: '1px solid rgba(0,240,255,0.5)',
    color: '#00F0FF',
    padding: '10px 16px',
    borderRadius: 6,
    fontFamily: 'var(--font-title)',
    fontSize: 14,
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: 1,
  },
  secondaryBtn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.6)',
    padding: '10px',
    borderRadius: 6,
    fontFamily: 'var(--font-title)',
    fontSize: 12,
    cursor: 'pointer',
    marginTop: 10,
  },
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.1)',
    margin: '4px 0',
  },
  error: {
    color: '#FF003C',
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
    textAlign: 'center',
    background: 'rgba(255,0,60,0.1)',
    padding: 8,
    borderRadius: 4,
  },
};
