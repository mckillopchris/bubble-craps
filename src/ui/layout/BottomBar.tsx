// ============================================================
// Bottom Bar - Interblock-style consolidated control strip
// Roll history | Clear | Chips | Double/Repeat | ROLL
// ============================================================

import { useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CHIP_VALUES, CHIP_COLORS } from '../chips/chipConstants';
import { soundManager } from '../../audio/SoundManager';
import { DicePairIcon } from '../table/DiceFaceIcon';
import './BottomBar.css';

const OUTCOME_BG: Record<number, string> = {
  2: 'rgba(255, 82, 82, 0.2)',
  3: 'rgba(255, 82, 82, 0.15)',
  7: 'rgba(255, 23, 68, 0.3)',
  11: 'rgba(105, 240, 174, 0.2)',
  12: 'rgba(255, 82, 82, 0.2)',
};

interface BottomBarProps {
  onRoll: () => void;
}

export default function BottomBar({ onRoll }: BottomBarProps) {
  const isRolling = useGameStore((s) => s.isRolling);
  const bets = useGameStore((s) => s.bets);
  const credits = useGameStore((s) => s.credits);
  const selectedChipValue = useGameStore((s) => s.selectedChipValue);
  const setSelectedChip = useGameStore((s) => s.setSelectedChip);
  const lastBetConfig = useGameStore((s) => s.lastBetConfig);
  const clearAllBets = useGameStore((s) => s.clearAllBets);
  const doubleBets = useGameStore((s) => s.doubleBets);
  const repeatLastBet = useGameStore((s) => s.repeatLastBet);
  const rollHistory = useGameStore((s) => s.rollHistory);

  const hasBets = bets.length > 0;
  const hasLastBetConfig = lastBetConfig.length > 0;

  const handleClearAll = useCallback(() => {
    clearAllBets();
    soundManager.play('chipPlace');
  }, [clearAllBets]);

  return (
    <div className="bottom-bar">
      {/* Roll History - horizontal dice strip */}
      <div className="bb-history">
        {rollHistory.length === 0 ? (
          <span className="bb-history-empty">No rolls</span>
        ) : (
          <div className="bb-history-strip">
            {rollHistory.slice(0, 12).map((outcome, i) => (
              <div
                key={i}
                className={`bb-history-item ${i === 0 ? 'bb-history-latest' : ''}`}
                style={{ background: OUTCOME_BG[outcome.total] ?? 'rgba(255,255,255,0.05)' }}
              >
                <DicePairIcon
                  die1={outcome.die1 as 1|2|3|4|5|6}
                  die2={outcome.die2 as 1|2|3|4|5|6}
                  size={14}
                />
                <span className="bb-history-total">{outcome.total}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clear All Bets */}
      <button
        className="bb-btn bb-clear"
        onClick={handleClearAll}
        disabled={!hasBets || isRolling}
        title="Clear all bets"
      >
        <span className="bb-btn-icon">&#10005;</span>
        <span className="bb-btn-text">CLEAR<br />ALL BETS</span>
      </button>

      {/* Chip Rack */}
      <div className="bb-chips">
        {CHIP_VALUES.map((value) => (
          <button
            key={value}
            className={`bb-chip ${selectedChipValue === value ? 'bb-chip-selected' : ''} ${
              value > credits ? 'bb-chip-disabled' : ''
            }`}
            style={{
              '--chip-color': CHIP_COLORS[value],
              '--chip-border': value === 1 ? '#999' : CHIP_COLORS[value],
            } as React.CSSProperties}
            onClick={() => setSelectedChip(value)}
            disabled={value > credits}
            title={`$${value} chip`}
          >
            <span className="bb-chip-value">${value}</span>
          </button>
        ))}
      </div>

      {/* Double / Repeat */}
      <button
        className="bb-btn bb-double"
        onClick={doubleBets}
        disabled={!hasBets || isRolling}
        title="Double all bets"
      >
        <span className="bb-btn-icon">&#215;2</span>
        <span className="bb-btn-text">DOUBLE<br />BET</span>
      </button>

      <button
        className="bb-btn bb-repeat"
        onClick={repeatLastBet}
        disabled={!hasLastBetConfig || isRolling}
        title="Repeat last round's bets"
      >
        <span className="bb-btn-icon">&#8635;</span>
        <span className="bb-btn-text">REPEAT<br />LAST BET</span>
      </button>

      {/* ROLL Button */}
      <button
        className="bb-roll"
        onClick={onRoll}
        disabled={isRolling || !hasBets}
      >
        {isRolling ? 'ROLLING...' : 'ROLL'}
      </button>
    </div>
  );
}
