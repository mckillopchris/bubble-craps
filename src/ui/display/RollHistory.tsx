// ============================================================
// Roll History - Shows recent dice outcomes
// ============================================================

import { useGameStore } from '../../store/gameStore';
import './RollHistory.css';

const OUTCOME_COLORS: Record<number, string> = {
  2: '#ff5252',
  3: '#ff5252',
  7: '#ff1744',
  11: '#69f0ae',
  12: '#ff5252',
};

export default function RollHistory() {
  const rollHistory = useGameStore((s) => s.rollHistory);

  if (rollHistory.length === 0) {
    return (
      <div className="roll-history">
        <div className="history-header">ROLL HISTORY</div>
        <div className="history-empty">No rolls yet</div>
      </div>
    );
  }

  return (
    <div className="roll-history">
      <div className="history-header">ROLL HISTORY</div>
      <div className="history-list">
        {rollHistory.slice(0, 20).map((outcome, i) => (
          <div
            key={i}
            className={`history-item ${i === 0 ? 'history-latest' : ''}`}
            style={{ color: OUTCOME_COLORS[outcome.total] ?? '#fff' }}
          >
            <span className="history-total">{outcome.total}</span>
            <span className="history-dice">
              {outcome.die1}-{outcome.die2}
              {outcome.isHardWay && outcome.total !== 2 && outcome.total !== 12 && (
                <span className="hard-indicator">H</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
