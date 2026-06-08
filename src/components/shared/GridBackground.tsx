interface GridBackgroundProps {
  accentColor?: string;
  opacity?: number;
  size?: number;
}

export default function GridBackground({ accentColor = '#00F0FF', opacity = 0.04, size = 40 }: GridBackgroundProps) {
  const r = parseInt(accentColor.slice(1, 3), 16);
  const g = parseInt(accentColor.slice(3, 5), 16);
  const b = parseInt(accentColor.slice(5, 7), 16);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(${r},${g},${b},${opacity}) 1px, transparent 1px),
          linear-gradient(90deg, rgba(${r},${g},${b},${opacity}) 1px, transparent 1px)
        `,
        backgroundSize: `${size}px ${size}px`,
      }}
    />
  );
}
