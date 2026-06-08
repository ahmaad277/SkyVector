import { useEffect, useState, useRef } from 'react';
import type { DailyMission } from '../../types/game.types';

interface DailyMissionsPanelProps {
  missions: DailyMission[];
}

export default function DailyMissionsPanel({ missions }: DailyMissionsPanelProps) {
  const [missionPopups, setMissionPopups] = useState<{id: string, text: string}[]>([]);
  const prevMissionsRef = useRef(missions);

  // Track mission completions
  useEffect(() => {
    const prev = prevMissionsRef.current;
    const newlyCompleted = missions.filter(m => 
      m.completed && !prev.find(p => p.id === m.id)?.completed
    );

    if (newlyCompleted.length > 0) {
      const newPopups = newlyCompleted.map(m => ({
        id: Math.random().toString(),
        text: `✓ MISSION COMPLETE: ${m.description} (+${m.xpReward} XP)`
      }));
      setMissionPopups(prev => [...prev, ...newPopups]);

      newPopups.forEach(p => {
        setTimeout(() => {
          setMissionPopups(current => current.filter(x => x.id !== p.id));
        }, 3000);
      });
    }
    prevMissionsRef.current = missions;
  }, [missions]);

  if (!missions || missions.length === 0) return null;

  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: 10,
        right: 10, // Moved to bottom right
        width: 220,
        background: 'rgba(11, 19, 43, 0.85)',
        border: '1px solid rgba(0, 240, 255, 0.2)',
        borderRadius: 6,
        padding: '8px 12px',
        pointerEvents: 'auto',
        zIndex: 50,
      }}>
        <div style={{ fontSize: 10, color: '#00F0FF', fontWeight: 'bold', marginBottom: 6, letterSpacing: 1 }}>
          DAILY MISSIONS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
          {missions.map(m => (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 9, color: m.completed ? '#39FF14' : 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.description}>
                {m.completed ? '✓ ' : ''}{m.description}
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                <div style={{ height: '100%', background: m.completed ? '#39FF14' : '#00F0FF', width: `${Math.min(100, (m.current / m.target) * 100)}%`, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mission Popups */}
      <div style={{
        position: 'fixed',
        top: 120,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
        zIndex: 50,
      }}>
        {missionPopups.map(p => (
          <div key={p.id} style={{
            background: 'rgba(57, 255, 20, 0.2)',
            border: '1px solid #39FF14',
            color: '#39FF14',
            padding: '8px 16px',
            borderRadius: 4,
            fontWeight: 'bold',
            fontSize: 14,
            animation: 'hudEventPulse 0.5s ease',
            boxShadow: '0 0 10px rgba(57, 255, 20, 0.5)'
          }}>
            {p.text}
          </div>
        ))}
      </div>
    </>
  );
}
