// ============================================================
// Game Controls - Bet management buttons
// ============================================================

import { useGameStore } from '../../store/gameStore';
import './GameControls.css';

export default function GameControls() {
  const isRolling = useGameStore((s) => s.isRolling);
  const bets = useGameStore((s) => s.bets);
  const betsOn = useGameStore((s) => s.betsOn);
  const lastBetConfig = useGameStore((s) => s.lastBetConfig);
  const clearLastBet = useGameStore((s) => s.clearLastBet);
  const clearAllBets = useGameStore((s) => s.clearAllBets);
  const doubleBets = useGameStore((s) => s.doubleBets);
  const repeatLastBet = useGameStore((s) => s.repeatLastBet);
  const toggleBetsOnOff = useGameStore((s) => s.toggleBetsOnOff);
  const resetGame = useGameStore((s) => s.resetGame);

  const hasBets = bets.length > 0;
  const hasLastBetConfig = lastBetConfig.length > 0;

  return (
    <div className="game-controls">
      <div className="controls-row">
        <button
          className="control-btn clear-btn"
          onClick={clearLastBet}
          disabled={!hasBets || isRolling}
          title="Clear last bet"
        >
          CLEAR LAST
        </button>
        <button
          className="control-btn clear-btn"
          onClick={clearAllBets}
          disabled={!hasBets || isRolling}
          title="Clear all bets"
        >
          CLEAR ALL
        </button>
        <button
          className="control-btn double-btn"
          onClick={doubleBets}
          disabled={!hasBets || isRolling}
          title="Double all bets"
        >
          DOUBLE
        </button>
        <button
          className="control-btn repeat-btn"
          onClick={repeatLastBet}
          disabled={!hasLastBetConfig || isRolling}
          title="Repeat last round's bets"
        >
          REPEAT
        </button>
        <button
          className={`control-btn toggle-btn ${betsOn ? 'bets-on' : 'bets-off'}`}
          onClick={toggleBetsOnOff}
          disabled={isRolling}
          title="Toggle bets on/off"
        >
          BETS {betsOn ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="controls-row">
        <button
          className="control-btn reset-btn"
          onClick={resetGame}
          disabled={isRolling}
          title="Reset game"
        >
          NEW GAME
        </button>
      </div>
    </div>
  );
}
