export type BackgroundTheme = 'classic' | 'satellite' | 'tactical' | 'night_ops' | 'amber_crt';

export const THEMES: Record<BackgroundTheme, { name: string; description: string }> = {
  classic: { name: 'Classic Radar', description: 'Standard deep blue radar' },
  satellite: { name: 'Satellite View', description: 'Simulated terrain map' },
  tactical: { name: 'Tactical Grid', description: 'Dense grid with coordinates' },
  night_ops: { name: 'Night Ops', description: 'Dark mode with moving stars' },
  amber_crt: { name: 'Amber CRT', description: 'Retro amber monochrome' },
};

export function getBackgroundTheme(): BackgroundTheme {
  const saved = localStorage.getItem('skyvector_background');
  if (saved && saved in THEMES) return saved as BackgroundTheme;
  return 'classic';
}

export function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, theme: BackgroundTheme, now: number) {
  ctx.save();
  
  if (theme === 'classic') {
    ctx.fillStyle = '#0B1325';
    ctx.fillRect(0, 0, W, H);
  } 
  else if (theme === 'satellite') {
    // Base green/brown
    ctx.fillStyle = '#0a1c15';
    ctx.fillRect(0, 0, W, H);
    
    // Procedural noise patches
    ctx.fillStyle = 'rgba(15, 40, 25, 0.4)';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(
        (Math.sin(i * 123) * 0.5 + 0.5) * W,
        (Math.cos(i * 321) * 0.5 + 0.5) * H,
        150 + Math.sin(i) * 50,
        0, Math.PI * 2
      );
      ctx.fill();
    }
    
    // Water patches
    ctx.fillStyle = 'rgba(10, 25, 45, 0.5)';
    ctx.beginPath();
    ctx.ellipse(W * 0.8, H * 0.2, 200, 100, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  }
  else if (theme === 'tactical') {
    ctx.fillStyle = '#050a0f';
    ctx.fillRect(0, 0, W, H);
    
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }
  else if (theme === 'night_ops') {
    ctx.fillStyle = '#020205';
    ctx.fillRect(0, 0, W, H);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 50; i++) {
      // Pseudo-random but deterministic based on time
      const x = ((Math.sin(i * 999) * 0.5 + 0.5) * W + now / 50) % W;
      const y = ((Math.cos(i * 888) * 0.5 + 0.5) * H + now / 80) % H;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  else if (theme === 'amber_crt') {
    ctx.fillStyle = '#1a0a00';
    ctx.fillRect(0, 0, W, H);
  }

  ctx.restore();
}
