import React, { useState, useEffect } from 'react';
import { LEVELS } from '../levels';

interface SettingsModalProps {
  onClose: () => void;
  onUnlockAllStages: () => void;
  onLockAllStages: () => void;
  onResetProgress: () => void;
  unlockedLevel: number;
}

export default function SettingsModal({
  onClose,
  onUnlockAllStages,
  onLockAllStages,
  onResetProgress,
  unlockedLevel,
}: SettingsModalProps) {
  const [password, setPassword] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('skyvector_volume');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [muted, setMuted] = useState(() => {
    return localStorage.getItem('skyvector_muted') === 'true';
  });
  const [scanlines, setScanlines] = useState(() => {
    return localStorage.getItem('skyvector_scanlines') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('skyvector_volume', volume.toString());
    window.dispatchEvent(new Event('settings_changed'));
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('skyvector_muted', muted.toString());
    window.dispatchEvent(new Event('settings_changed'));
  }, [muted]);

  useEffect(() => {
    localStorage.setItem('skyvector_scanlines', scanlines.toString());
    window.dispatchEvent(new Event('settings_changed'));
  }, [scanlines]);

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === 'احمد') {
      if (unlockedLevel >= LEVELS.length) {
        onLockAllStages();
        setSettingsMessage('STAGES LOCKED');
      } else {
        onUnlockAllStages();
        setSettingsMessage('ALL STAGES UNLOCKED');
      }
      setPassword('');
      setTimeout(() => {
        onClose();
      }, 1500);
      return;
    }
    setSettingsMessage('INVALID PASSWORD');
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      onResetProgress();
      setSettingsMessage('PROGRESS RESET');
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.settingsModal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.settingsTitle}>SETTINGS</div>
        
        {/* Audio Settings */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>AUDIO</div>
          <div style={styles.row}>
            <label style={styles.label}>MUTE</label>
            <input 
              type="checkbox" 
              checked={muted} 
              onChange={(e) => setMuted(e.target.checked)} 
              style={styles.checkbox}
            />
          </div>
          <div style={styles.row}>
            <label style={styles.label}>VOLUME</label>
            <input 
              type="range" 
              min="0" max="1" step="0.1" 
              value={volume} 
              onChange={(e) => setVolume(parseFloat(e.target.value))} 
              disabled={muted}
              style={{ flex: 1, cursor: muted ? 'not-allowed' : 'pointer' }}
            />
          </div>
        </div>

        {/* Visual Settings */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>VISUALS</div>
          <div style={styles.row}>
            <label style={styles.label}>CRT SCANLINES</label>
            <input 
              type="checkbox" 
              checked={scanlines} 
              onChange={(e) => setScanlines(e.target.checked)} 
              style={styles.checkbox}
            />
          </div>
        </div>

        {/* Admin / Cheats */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>ADMIN</div>
          <form onSubmit={handleUnlockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={styles.settingsText}>
              {unlockedLevel >= LEVELS.length ? 'ENTER PASSWORD TO LOCK STAGES' : 'ENTER PASSWORD TO UNLOCK ALL STAGES'}
            </div>
            <input
              style={styles.passwordInput}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setSettingsMessage('');
              }}
              placeholder="PASSWORD"
            />
            <button type="submit" style={styles.primaryBtn}>
              {unlockedLevel >= LEVELS.length ? 'LOCK' : 'UNLOCK'}
            </button>
          </form>
        </div>

        {/* Reset Progress */}
        <div style={styles.section}>
          <button type="button" style={styles.dangerBtn} onClick={handleReset}>
            RESET PROGRESS
          </button>
        </div>

        {settingsMessage && (
          <div style={{
            ...styles.settingsMessage,
            color: settingsMessage.includes('INVALID') ? '#FF003C' : '#39FF14',
          }}>
            {settingsMessage}
          </div>
        )}

        <div style={styles.settingsActions}>
          <button type="button" style={styles.secondaryBtn} onClick={onClose}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  modalBackdrop: {
    position: 'absolute',
    inset: 0,
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  settingsModal: {
    width: 'min(360px, 92vw)',
    maxHeight: '90vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: 22,
    background: 'rgba(13, 27, 42, 0.94)',
    border: '1px solid rgba(0,240,255,0.28)',
    borderRadius: 16,
    boxShadow: '0 18px 50px rgba(0,0,0,0.65), 0 0 24px rgba(0,240,255,0.12)',
  },
  settingsTitle: {
    fontFamily: 'var(--font-title)',
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 3,
    color: '#00F0FF',
    textAlign: 'center',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '12px',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  sectionTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    fontWeight: 700,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 2,
    marginBottom: 4,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: '#FFF',
  },
  checkbox: {
    cursor: 'pointer',
    width: 16,
    height: 16,
  },
  settingsText: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: 1,
    lineHeight: 1.4,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
  },
  passwordInput: {
    fontFamily: 'var(--font-mono)',
    fontSize: 16,
    color: '#FFFFFF',
    background: 'rgba(0,240,255,0.06)',
    border: '1px solid rgba(0,240,255,0.28)',
    borderRadius: 8,
    outline: 'none',
    padding: '8px 12px',
    textAlign: 'center',
  },
  settingsMessage: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.5,
    textAlign: 'center',
    minHeight: 14,
  },
  settingsActions: {
    display: 'flex',
    gap: 10,
    marginTop: 8,
  },
  secondaryBtn: {
    flex: 1,
    fontFamily: 'var(--font-title)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.62)',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 8,
    padding: '10px',
    cursor: 'pointer',
  },
  primaryBtn: {
    flex: 1,
    fontFamily: 'var(--font-title)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 2,
    color: '#06121D',
    background: '#00F0FF',
    border: '1px solid rgba(0,240,255,0.8)',
    borderRadius: 8,
    padding: '10px',
    cursor: 'pointer',
    boxShadow: '0 0 12px rgba(0,240,255,0.25)',
  },
  dangerBtn: {
    width: '100%',
    fontFamily: 'var(--font-title)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 2,
    color: '#FF003C',
    background: 'rgba(255, 0, 60, 0.1)',
    border: '1px solid rgba(255, 0, 60, 0.4)',
    borderRadius: 8,
    padding: '10px',
    cursor: 'pointer',
  },
};
