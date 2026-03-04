// ============================================================
// Betting Timer - Countdown display for betting phase
// ============================================================

import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import './BettingTimer.css';

const DEFAULT_BETTING_TIME = 15; // seconds

export default function BettingTimer() {
  const bettingTimer = useGameStore((s) => s.bettingTimer);
  const isRolling = useGameStore((s) => s.isRolling);
  const setBettingTimer = useGameStore((s) => s.setBettingTimer);
  const tickBettingTimer = useGameStore((s) => s.tickBettingTimer);
  const bets = useGameStore((s) => s.bets);

  // Start timer when not rolling and reset after each roll completes
  useEffect(() => {
    if (!isRolling && bettingTimer === null) {
      setBettingTimer(DEFAULT_BETTING_TIME);
    }
  }, [isRolling, bettingTimer, setBettingTimer]);

  // Clear timer when rolling starts
  useEffect(() => {
    if (isRolling) {
      setBettingTimer(null);
    }
  }, [isRolling, setBettingTimer]);

  // Tick the timer every second
  useEffect(() => {
    if (bettingTimer === null || bettingTimer <= 0) return;
    const interval = setInterval(tickBettingTimer, 1000);
    return () => clearInterval(interval);
  }, [bettingTimer, tickBettingTimer]);

  if (bettingTimer === null || isRolling) return null;

  const isLow = bettingTimer <= 5;
  const hasBets = bets.length > 0;

  return (
    <div className={`betting-timer ${isLow ? 'timer-low' : ''}`}>
      <div className="timer-bar">
        <div
          className="timer-fill"
          style={{ width: `${(bettingTimer / DEFAULT_BETTING_TIME) * 100}%` }}
        />
      </div>
      <span className="timer-text">
        {bettingTimer > 0 ? `${bettingTimer}s` : 'TIME'}
      </span>
      {!hasBets && bettingTimer > 0 && (
        <span className="timer-warning">PLACE YOUR BETS</span>
      )}
      {bettingTimer === 0 && !hasBets && (
        <span className="timer-invalid">BETS ARE NOT VALID YET</span>
      )}
    </div>
  );
}
