import React from 'react';
import type { MultiplayerState } from '../engine/MultiplayerEngine';
import { getLandingTargetForLevel } from '../utils/levelProgress';
import { VERSUS_LANDING_GOAL, VERSUS_MATCH_MS, resolvePlayerColor } from '../engine/MultiplayerEngine';

interface MultiplayerHUDProps {
  multiplayerState: MultiplayerState;
  totalLandings: number;
  lives: number;
  score: number;
}

export default function MultiplayerHUD({
  multiplayerState,
  totalLandings,
  lives,
  score,
}: MultiplayerHUDProps) {
  const { room, players, playerScores, playerLandings, playerLives, matchStartedAt } = multiplayerState;
  const elapsed = Date.now() - matchStartedAt;
  const versusRemaining = Math.max(0, VERSUS_MATCH_MS - elapsed);

  const modeLabel = room.mode.replace('_', ' ').toUpperCase();
  const coopTarget =
    room.mode !== 'versus' ? getLandingTargetForLevel(room.level) : VERSUS_LANDING_GOAL;

  return (
    <div style={styles.bar}>
      <div style={styles.mode}>{modeLabel} · LVL {room.level}</div>
      {room.mode === 'versus' ? (
        <div style={styles.goal}>
          GOAL: {VERSUS_LANDING_GOAL} LANDINGS · {Math.ceil(versusRemaining / 1000)}s left
        </div>
      ) : (
        <div style={styles.goal}>
          TEAM: {totalLandings}/{coopTarget} · LIVES {lives} · SCORE {score.toLocaleString()}
        </div>
      )}
      <div style={styles.players}>
        {players.map((p) => {
          const eliminated = (playerLives[p.player_id] ?? 0) <= 0;
          return (
          <span key={p.id} style={{
            ...styles.chip,
            borderColor: resolvePlayerColor(p.color),
            color: resolvePlayerColor(p.color),
            opacity: eliminated ? 0.45 : 1,
          }}>
            {p.username}
            {room.mode === 'versus'
              ? ` ♥${playerLives[p.player_id] ?? 0} · ${playerLandings[p.player_id] ?? 0}/${VERSUS_LANDING_GOAL}`
              : room.mode === 'coop_squad'
                ? ` (${playerLandings[p.player_id] ?? 0})`
                : ''}
            {room.mode === 'versus' ? ` · ${(playerScores[p.player_id] ?? 0).toLocaleString()}` : ''}
            {eliminated ? ' OUT' : ''}
          </span>
        );})}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    padding: '6px 12px',
    background: 'rgba(0,0,0,0.45)',
    borderBottom: '1px solid rgba(0,240,255,0.2)',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  mode: {
    color: '#00F0FF',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  goal: {
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 6,
  },
  players: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    padding: '2px 8px',
    borderRadius: 4,
    border: '1px solid',
    background: 'rgba(0,0,0,0.3)',
  },
};
