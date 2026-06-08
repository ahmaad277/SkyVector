import React from 'react';

interface GlassPanelProps {
  maxWidth?: number;
  borderColor?: string;
  boxShadow?: string;
  gap?: number;
  padding?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

export default function GlassPanel({
  maxWidth = 380,
  borderColor = 'rgba(0,240,255,0.15)',
  boxShadow,
  gap = 16,
  padding = '30px 32px',
  children,
  onClick,
  style,
}: GlassPanelProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap,
        padding,
        background: 'rgba(13, 27, 42, 0.95)',
        border: `1px solid ${borderColor}`,
        borderRadius: 16,
        maxWidth,
        width: '90%',
        boxShadow: boxShadow || '0 10px 40px rgba(0,0,0,0.8), inset 0 0 40px rgba(0,240,255,0.02)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        overflowY: 'auto',
        maxHeight: '90vh',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
