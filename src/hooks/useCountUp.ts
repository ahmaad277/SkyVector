import { useEffect, useRef, useState } from 'react';

export function useCountUp(target: number, duration = 400): number {
  const [value, setValue] = useState(target);
  const prevTargetRef = useRef(target);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const fromRef = useRef(target);

  useEffect(() => {
    if (target === prevTargetRef.current) {
      return;
    }

    fromRef.current = value;
    prevTargetRef.current = target;
    startRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease out quad
      const ease = 1 - (1 - progress) * (1 - progress);
      const current = Math.round(fromRef.current + (target - fromRef.current) * ease);
      setValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}
