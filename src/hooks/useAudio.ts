import { useRef, useCallback, useEffect } from 'react';

type SoundName =
  | 'landing'
  | 'landing_emergency'
  | 'landing_vip'
  | 'collision'
  | 'draw_path'
  | 'combo'
  | 'event_alert'
  | 'radar_ping'
  | 'holding_toggle'
  | 'fuel_warning';

export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  // ── Synthesized sounds via Web Audio API ─────────────────
  const play = useCallback((name: SoundName) => {
    try {
      const ctx = getCtx();
      switch (name) {
        case 'landing':         playLandingSound(ctx, false, false); break;
        case 'landing_emergency': playLandingSound(ctx, true, false); break;
        case 'landing_vip':     playLandingSound(ctx, false, true);  break;
        case 'collision':       playCollisionSound(ctx);              break;
        case 'draw_path':       playPathSound(ctx);                   break;
        case 'combo':           playComboSound(ctx);                  break;
        case 'event_alert':     playEventAlert(ctx);                  break;
        case 'radar_ping':      playRadarPing(ctx);                   break;
        case 'holding_toggle':  playHoldingToggle(ctx);               break;
        case 'fuel_warning':    playFuelWarning(ctx);                 break;
      }
    } catch {
      // Audio context blocked — silently ignore
    }
  }, [getCtx]);

  useEffect(() => {
    return () => {
      ctxRef.current?.close();
    };
  }, []);

  return { play };
}

// ── Sound synthesizers ────────────────────────────────────────

function playLandingSound(ctx: AudioContext, emergency: boolean, vip: boolean) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  if (vip) {
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.2);
  } else if (emergency) {
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
  } else {
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
  }

  osc.type = 'sine';
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.35);
}

function playCollisionSound(ctx: AudioContext) {
  const bufferSize = ctx.sampleRate * 0.6;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.6, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

function playPathSound(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.12);
}

function playComboSound(ctx: AudioContext) {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.07;
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.start(t);
    osc.stop(t + 0.15);
  });
}

function playEventAlert(ctx: AudioContext) {
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.value = i % 2 === 0 ? 440 : 370;
    const t = ctx.currentTime + i * 0.18;
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.start(t);
    osc.stop(t + 0.14);
  }
}

function playRadarPing(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.4);
  gain.gain.setValueAtTime(0.07, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.4);
}

function playHoldingToggle(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(700, ctx.currentTime);
  osc.frequency.setValueAtTime(500, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}

function playFuelWarning(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}
