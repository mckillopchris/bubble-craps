// ============================================================
// Special Buttons - Press, Across, Inside, Outside
// Convenience betting shortcuts
// ============================================================

import { GamePhase } from '../../engine/types';
import { useGameStore } from '../../store/gameStore';
import './SpecialButtons.css';

export default function SpecialButtons() {
  const isRolling = useGameStore((s) => s.isRolling);
  const phase = useGameStore((s) => s.phase);
  const point = useGameStore((s) => s.point);
  const pressLastPoint = useGameStore((s) => s.pressLastPoint);
  const placeBetsAcross = useGameStore((s) => s.placeBetsAcross);
  const placeBetsInside = useGameStore((s) => s.placeBetsInside);
  const placeBetsOutside = useGameStore((s) => s.placeBetsOutside);

  const hasPoint = phase === GamePhase.Point && point !== null;

  return (
    <div className="special-buttons">
      <button
        className="special-btn press-btn"
        onClick={pressLastPoint}
        disabled={isRolling || !hasPoint}
        title="Double the Place bet on the current point"
      >
        PRESS
      </button>
      <button
        className="special-btn across-btn"
        onClick={placeBetsAcross}
        disabled={isRolling}
        title="Place bets on all points except the established one"
      >
        ACROSS
      </button>
      <button
        className="special-btn inside-btn"
        onClick={placeBetsInside}
        disabled={isRolling}
        title="Place bets on 5, 6, 8, 9 (except established point)"
      >
        INSIDE
      </button>
      <button
        className="special-btn outside-btn"
        onClick={placeBetsOutside}
        disabled={isRolling}
        title="Place bets on 4, 5, 9, 10 (except established point)"
      >
        OUTSIDE
      </button>
    </div>
  );
}
