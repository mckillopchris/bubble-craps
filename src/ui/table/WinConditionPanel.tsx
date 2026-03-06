// ============================================================
// Win Condition Panel - Shows numbers 2-12, highlights winners
// ============================================================

import { GamePhase } from '../../engine/types';
import { useGameStore } from '../../store/gameStore';
import './WinConditionPanel.css';

const ALL_TOTALS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function WinConditionPanel() {
  const phase = useGameStore((s) => s.phase);
  const point = useGameStore((s) => s.point);
  const rollHistory = useGameStore((s) => s.rollHistory);

  const lastTotal = rollHistory.length > 0 ? rollHistory[0]!.total : null;

  // Determine which totals are "winning" for the current phase
  const getWinClass = (total: number): string => {
    if (total === lastTotal) return 'wc-last-hit';
    if (phase === GamePhase.ComeOut) {
      // Come-out: 7 and 11 win for pass line
      if (total === 7 || total === 11) return 'wc-win';
    } else if (phase === GamePhase.Point) {
      // Point phase: the point number wins for pass line, 7 loses
      if (total === point) return 'wc-win';
      if (total === 7) return 'wc-lose';
    }
    return '';
  };

  return (
    <div className="win-condition-panel">
      <div className="wc-header">
        <span className="wc-puck">{phase === GamePhase.Point ? 'ON' : 'OFF'}</span>
        <div className="wc-title">WIN<br />CONDITION</div>
      </div>
      {ALL_TOTALS.map((total) => (
        <div key={total} className={`wc-number ${getWinClass(total)}`}>
          {total}
        </div>
      ))}
    </div>
  );
}
