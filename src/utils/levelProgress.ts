export function getLandingTargetForLevel(level: number): number {
  const targets: Record<number, number> = {
    1: 8,
    2: 12,
    3: 16,
    4: 20,
    5: 24,
    6: 30,
    7: 34,
    8: 38
  };
  return targets[level] || 38;
}
