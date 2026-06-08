import React from 'react';

interface ModalOverlayProps {
  onClose?: () => void;
  blur?: number;
  zIndex?: number;
  children: React.ReactNode;
  tint?: 'dark' | 'red' | 'none';
  style?: React.CSSProperties;
}

export default function ModalOverlay({
  onClose,
  blur = 4,
  zIndex = 100,
  children,
  tint = 'dark',
  style,
}: ModalOverlayProps) {
  const tintBackgrounds: Record<string, string> = {
    dark: 'rgba(11,19,43,0.92)',
    red: 'rgba(20,5,5,0.94)',
    none: 'transparent',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: tintBackgrounds[tint],
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        zIndex,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
