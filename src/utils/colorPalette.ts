export const COLORS = {
  // Backgrounds — Deep Midnight Blue / Charcoal
  BG_DEEP:         '#0B1325',
  BG_GRID:         '#111D30',
  BG_PANEL:        '#0D1B2A',

  // Aircraft
  AIRCRAFT_CIVIL:    '#39FF14',   // Razor Emerald — Cessna + Jetliner
  AIRCRAFT_MILITARY: '#00F0FF',   // Electric Cyan — Fighter
  AIRCRAFT_HELI:     '#7FFF00',   // Chartreuse — Helicopter
  AIRCRAFT_VIP:      '#FFD700',   // Gold — VIP
  AIRCRAFT_EMERGENCY:'#FF003C',   // Red — Emergency

  // UI Elements
  RUNWAY:          '#FFFFFF',
  HELIPAD:         '#FFFFFF',
  RADAR_SWEEP:     'rgba(57, 255, 20, 0.10)',
  RADAR_GRID:      'rgba(0, 240, 255, 0.08)',

  // Separation radius rings
  RING_SAFE:       'rgba(57, 255, 20, 0.14)',
  RING_WARNING:    'rgba(255, 165, 0, 0.4)',
  RING_DANGER:     'rgba(255, 0, 60, 0.6)',

  // Path drawing
  PATH_ACTIVE:     'rgba(57, 255, 20, 0.85)',
  PATH_PREVIEW:    'rgba(57, 255, 20, 0.28)',

  // HUD — switched primary from retro-green to Electric Cyan
  HUD_TEXT:        '#00F0FF',
  HUD_DIM:         'rgba(0, 240, 255, 0.45)',
  HUD_ACCENT:      '#39FF14',
  HUD_WARNING:     '#FFA500',
  HUD_DANGER:      '#FF003C',
  HUD_GOLD:        '#FFD700',

  // Fuel bar
  FUEL_HIGH:       '#39FF14',
  FUEL_MID:        '#FFA500',
  FUEL_LOW:        '#FF003C',

  // Combo
  COMBO_1:         '#39FF14',
  COMBO_2:         '#00F0FF',
  COMBO_3:         '#FFA500',
  COMBO_MAX:       '#FFD700',

  // Event overlay
  EVENT_OVERLAY:   'rgba(255, 0, 60, 0.08)',
  EVENT_TEXT:      '#FF003C',

  // Holding pattern
  HOLDING_RING:    'rgba(0, 240, 255, 0.25)',

  // Scanline overlay (aesthetic)
  SCANLINE:        'rgba(0, 0, 0, 0.025)',
} as const;

export type ColorKey = keyof typeof COLORS;

export function getFuelColor(fuel: number): string {
  if (fuel > 50) return COLORS.FUEL_HIGH;
  if (fuel > 20) return COLORS.FUEL_MID;
  return COLORS.FUEL_LOW;
}

export function getAircraftColor(
  type: import('../types/game.types').AircraftType,
  isEmergency: boolean,
  isNORDO: boolean
): string {
  if (isNORDO) return COLORS.AIRCRAFT_VIP;
  if (isEmergency) return COLORS.AIRCRAFT_EMERGENCY;
  switch (type) {
    case 'fighter':    return COLORS.AIRCRAFT_MILITARY;
    case 'helicopter': return COLORS.AIRCRAFT_HELI;
    default:           return COLORS.AIRCRAFT_CIVIL;
  }
}

export function getRingColor(overlap: 'none' | 'warning' | 'danger'): string {
  switch (overlap) {
    case 'warning': return COLORS.RING_WARNING;
    case 'danger':  return COLORS.RING_DANGER;
    default:        return COLORS.RING_SAFE;
  }
}

export function getComboColor(multiplier: number): string {
  if (multiplier >= 5) return COLORS.COMBO_MAX;
  if (multiplier >= 3) return COLORS.COMBO_3;
  if (multiplier >= 2) return COLORS.COMBO_2;
  return COLORS.COMBO_1;
}
