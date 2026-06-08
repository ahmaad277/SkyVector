import React, { useEffect, useState, useCallback } from 'react';

interface ToastMessage {
  id: number;
  text: string;
  type: 'info' | 'success' | 'error' | 'warning';
  expiresAt: number;
}

let toastId = 0;
let addToastFn: ((text: string, type?: ToastMessage['type']) => void) | null = null;

export function showToast(text: string, type: ToastMessage['type'] = 'info') {
  if (addToastFn) addToastFn(text, type);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, text, type, expiresAt: Date.now() + 3500 }]);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const id = setInterval(() => {
      setToasts(prev => prev.filter(t => t.expiresAt > Date.now()));
    }, 500);
    return () => clearInterval(id);
  }, [toasts.length]);

  if (toasts.length === 0) return null;

  const typeStyles: Record<string, React.CSSProperties> = {
    info:    { background: 'rgba(0,240,255,0.15)', borderColor: 'rgba(0,240,255,0.5)', color: '#00F0FF' },
    success: { background: 'rgba(57,255,20,0.12)', borderColor: 'rgba(57,255,20,0.5)', color: '#39FF14' },
    error:   { background: 'rgba(255,0,60,0.15)',  borderColor: 'rgba(255,0,60,0.5)',  color: '#FF003C' },
    warning: { background: 'rgba(255,215,0,0.12)', borderColor: 'rgba(255,215,0,0.5)', color: '#FFD700' },
  };

  return (
    <div style={containerStyle}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            ...toastStyle,
            ...typeStyles[t.type],
            animation: 'toastSlideIn 0.3s ease-out',
          }}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 'env(safe-area-inset-top, 12px)',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  pointerEvents: 'none',
};

const toastStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'clamp(10px, 2.5vw, 12px)',
  fontWeight: 700,
  letterSpacing: 1,
  padding: '8px 18px',
  borderRadius: 8,
  border: '1px solid',
  backdropFilter: 'blur(8px)',
  textAlign: 'center',
  whiteSpace: 'nowrap',
};
