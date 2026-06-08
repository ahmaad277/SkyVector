import React, { useState, useCallback, useEffect } from 'react';

interface TutorialStep {
  title: string;
  description: string;
  targetSelector?: string; // CSS selector for spotlight element
  position?: 'top' | 'bottom' | 'center';
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to SkyVector',
    description: 'You are an Air Traffic Controller. Your radar screen shows all incoming aircraft. Your job: guide every plane to a safe landing.',
    position: 'center',
  },
  {
    title: 'Radar Screen',
    description: 'This is your radar display. Aircraft appear as colored dots moving across the screen. Each one shows its callsign, fuel level, and destination airport.',
    position: 'center',
  },
  {
    title: 'Drawing a Flight Path',
    description: 'Touch and hold an aircraft, then drag to draw a path. Release to send the aircraft along that path. Guide it to the matching colored runway at the correct altitude.',
    position: 'center',
  },
  {
    title: 'Altitude Levels',
    description: 'From Level 4 onward, aircraft fly at different altitudes. Use the FL1/FL2/FL3 buttons that appear on selected aircraft to match the correct altitude before landing.',
    position: 'center',
  },
  {
    title: 'Holding Patterns',
    description: 'Double-tap an aircraft to put it into a holding pattern. It will circle in place until you double-tap it again to release. Use this to manage traffic flow.',
    position: 'center',
  },
  {
    title: 'Events & Hazards',
    description: 'Watch for alerts: WIND SHEAR pushes aircraft off course, RUNWAY CLOSED blocks a runway, BIRD STRIKES create danger zones, and NORDO aircraft fly without communication.',
    position: 'center',
  },
  {
    title: 'You\'re Ready',
    description: 'Start with the campaign mode to learn the basics across 8 levels. Complete daily missions for bonus XP. Good luck, Commander!',
    position: 'center',
  },
];

interface OnboardingOverlayProps {
  onComplete: () => void;
  onDismiss: () => void;
}

const IS_FIRST_RUN_KEY = 'skyvector_tutorial_seen';

export function hasSeenTutorial(): boolean {
  return localStorage.getItem(IS_FIRST_RUN_KEY) === 'true';
}

export function markTutorialSeen(): void {
  localStorage.setItem(IS_FIRST_RUN_KEY, 'true');
}

export default function OnboardingOverlay({ onComplete, onDismiss }: OnboardingOverlayProps) {
  const [step, setStep] = useState(0);
  const currentStep = tutorialSteps[step];

  const next = useCallback(() => {
    if (step < tutorialSteps.length - 1) {
      setStep(s => s + 1);
    } else {
      markTutorialSeen();
      onComplete();
    }
  }, [step, onComplete]);

  const prev = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev, onDismiss]);

  return (
    <div style={styles.overlay}>
      <div style={styles.backdrop} onClick={onDismiss} />
      <div style={styles.card}>
        {/* Step counter */}
        <div style={styles.stepCounter}>
          {tutorialSteps.map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.stepDot,
                background: i === step ? '#00F0FF' : i < step ? 'rgba(0,240,255,0.4)' : 'rgba(255,255,255,0.1)',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div style={styles.content}>
          <div style={styles.stepNumber}>STEP {step + 1} OF {tutorialSteps.length}</div>
          <h2 style={styles.title}>{currentStep.title}</h2>
          <p style={styles.description}>{currentStep.description}</p>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button
            onClick={onDismiss}
            style={styles.skipBtn}
          >
            SKIP TUTORIAL
          </button>
          <div style={styles.navButtons}>
            {step > 0 && (
              <button onClick={prev} style={styles.navBtn}>← BACK</button>
            )}
            <button onClick={next} style={styles.primaryBtn}>
              {step < tutorialSteps.length - 1 ? 'NEXT →' : 'START FLYING'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
  },
  card: {
    position: 'relative',
    maxWidth: 400,
    width: '90%',
    background: 'rgba(13, 27, 42, 0.97)',
    border: '1px solid rgba(0, 240, 255, 0.4)',
    borderRadius: 20,
    padding: '32px 28px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 40px rgba(0,240,255,0.15)',
    animation: 'screenZoomIn 0.3s ease-out',
  },
  stepCounter: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    transition: 'background 0.3s ease',
  },
  stepNumber: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'rgba(0,240,255,0.5)',
    letterSpacing: 3,
    textAlign: 'center',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    textAlign: 'center',
  },
  title: {
    fontFamily: 'var(--font-title)',
    fontSize: 20,
    fontWeight: 800,
    color: '#00F0FF',
    margin: 0,
    letterSpacing: 1,
    textShadow: '0 0 12px rgba(0,240,255,0.3)',
  },
  description: {
    fontFamily: 'var(--font-ui)',
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 1.6,
    margin: 0,
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  skipBtn: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    letterSpacing: 1,
    padding: '8px 12px',
    transition: 'color 0.2s',
  },
  navButtons: {
    display: 'flex',
    gap: 8,
    marginLeft: 'auto',
  },
  navBtn: {
    fontFamily: 'var(--font-title)',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: '10px 16px',
    cursor: 'pointer',
    letterSpacing: 1,
    transition: 'all 0.2s',
  },
  primaryBtn: {
    fontFamily: 'var(--font-title)',
    fontSize: 12,
    fontWeight: 700,
    color: '#06121D',
    background: 'linear-gradient(135deg, #00F0FF, #00B4D8)',
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    cursor: 'pointer',
    letterSpacing: 1,
    boxShadow: '0 0 20px rgba(0,240,255,0.3)',
    transition: 'all 0.2s',
  },
};
