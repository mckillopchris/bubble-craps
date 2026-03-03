// ============================================================
// Game HUD - Credits, last win, phase, point display
// ============================================================

import { GamePhase } from '../../engine/types';
import { useGameStore } from '../../store/gameStore';
import './GameHUD.css';

export default function GameHUD() {
  const credits = useGameStore((s) => s.credits);
  const lastWin = useGameStore((s) => s.lastWin);
  const phase = useGameStore((s) => s.phase);
  const point = useGameStore((s) => s.point);
  const bets = useGameStore((s) => s.bets);

  const totalBets = bets.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="game-hud">
      <div className="hud-item">
        <span className="hud-label">CREDIT</span>
        <span className="hud-value credit-value">${credits.toFixed(0)}</span>
      </div>

      <div className="hud-item">
        <span className="hud-label">BET</span>
        <span className="hud-value bet-value">${totalBets.toFixed(0)}</span>
      </div>

      <div className="hud-item">
        <span className="hud-label">LAST WIN</span>
        <span className={`hud-value ${lastWin > 0 ? 'win-value' : ''}`}>
          ${lastWin.toFixed(0)}
        </span>
      </div>

      <div className="hud-item">
        <span className="hud-label">PHASE</span>
        <span className="hud-value phase-value">
          {phase === GamePhase.ComeOut ? 'COME OUT' : `POINT: ${point}`}
        </span>
      </div>

      <div className="hud-puck">
        <div className={`puck-display ${phase === GamePhase.Point ? 'puck-display-on' : 'puck-display-off'}`}>
          {phase === GamePhase.Point ? 'ON' : 'OFF'}
        </div>
      </div>
    </div>
  );
}
