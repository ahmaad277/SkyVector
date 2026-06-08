import React, { useEffect, useState } from 'react';

interface ScreenTransitionProps {
  children: React.ReactNode;
  direction?: 'fade' | 'slideUp' | 'slideRight' | 'zoomIn' | 'redBloom';
}

const animationMap: Record<string, string> = {
  fade: 'screenFadeIn 0.25s ease-out',
  slideUp: 'screenSlideUp 0.3s ease-out',
  slideRight: 'screenSlideRight 0.3s ease-out',
  zoomIn: 'screenZoomIn 0.3s ease-out',
  redBloom: 'screenRedBloom 0.35s ease-out',
};

export default function ScreenTransition({ children, direction = 'fade' }: ScreenTransitionProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        animation: visible ? animationMap[direction] : undefined,
        opacity: visible ? 1 : 0,
      }}
    >
      {children}
    </div>
  );
}
