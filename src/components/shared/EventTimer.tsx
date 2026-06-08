import React, { useEffect, useState } from 'react';
import type { GameEvent } from '../../types/game.types';
import { COLORS } from '../../utils/colorPalette';

export const eventLabel: Record<string, (e: GameEvent) => string> = {
  runway_closed: () => '⛔ RUNWAY CLOSED',
  wind_shear:    () => '🌀 WIND SHEAR',
  nordo_flight:  () => '★ NORDO AIRCRAFT INBOUND',
  bird_strike:   () => '🐦 BIRD STRIKE ZONE',
  round_start:   (e) => `ROUND ${e.payload?.round} STARTED! +${e.payload?.powerUpName}`,
};

export default function EventTimer({ event }: { event: GameEvent }) {
  const [remaining, setRemaining] = useState(event.duration / 1000);
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - event.startTime;
      setRemaining(Math.max(0, (event.duration - elapsed) / 1000));
    }, 200);
    return () => clearInterval(id);
  }, [event]);

  return (
    <span style={{ color: COLORS.HUD_WARNING, marginLeft: 10, fontSize: 11 }}>
      {remaining.toFixed(0)}s
    </span>
  );
}
