import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'gold';

interface ButtonProps {
  variant?: ButtonVariant;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit';
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'rgba(0,240,255,0.08)',
    border: '1px solid rgba(0,240,255,0.4)',
    color: '#00F0FF',
    boxShadow: '0 0 12px rgba(0,240,255,0.15)',
  },
  secondary: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    color: 'rgba(255,255,255,0.6)',
  },
  danger: {
    background: 'rgba(255,0,60,0.1)',
    border: '1px solid rgba(255,0,60,0.4)',
    color: '#FF003C',
  },
  ghost: {
    background: 'transparent',
    border: '1px solid transparent',
    color: 'rgba(255,255,255,0.5)',
  },
  gold: {
    background: 'rgba(255,215,0,0.08)',
    border: '1px solid rgba(255,215,0,0.4)',
    color: '#FFD700',
    boxShadow: '0 0 12px rgba(255,215,0,0.15)',
  },
};

const hoverBrighten: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'rgba(0,240,255,0.16)',
    border: '1px solid rgba(0,240,255,0.7)',
    boxShadow: '0 0 20px rgba(0,240,255,0.3)',
    transform: 'translateY(-1px)',
  },
  secondary: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.3)',
    transform: 'translateY(-1px)',
  },
  danger: {
    background: 'rgba(255,0,60,0.2)',
    border: '1px solid rgba(255,0,60,0.7)',
    boxShadow: '0 0 16px rgba(255,0,60,0.2)',
  },
  ghost: {
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.8)',
  },
  gold: {
    background: 'rgba(255,215,0,0.16)',
    border: '1px solid rgba(255,215,0,0.7)',
    boxShadow: '0 0 20px rgba(255,215,0,0.3)',
    transform: 'translateY(-1px)',
  },
};

export default function Button({
  variant = 'primary',
  onClick,
  disabled = false,
  fullWidth = false,
  type = 'button',
  children,
  style,
}: ButtonProps) {
  const [hovered, setHovered] = React.useState(false);

  const baseStyle: React.CSSProperties = {
    ...variantStyles[variant],
    padding: '10px 18px',
    borderRadius: 8,
    fontFamily: 'var(--font-title)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 2,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 0.18s ease',
    width: fullWidth ? '100%' : undefined,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...style,
  };

  if (!disabled && hovered) {
    Object.assign(baseStyle, hoverBrighten[variant]);
  }

  return (
    <button
      type={type}
      style={baseStyle}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setHovered(false)}
    >
      {children}
    </button>
  );
}
