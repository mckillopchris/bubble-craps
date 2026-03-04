// ============================================================
// Lucky Shooter Side Bet Component
// Tracks unique point numbers hit during a shooter's turn
// ============================================================

import { BetType, type PointNumber } from '../../engine/types';
import { LUCKY_SHOOTER_PAYOUTS } from '../../engine/bets';
import { useGameStore } from '../../store/gameStore';
import './LuckyShooter.css';

const POINT_NUMBERS: PointNumber[] = [4, 5, 6, 8, 9, 10];

export default function LuckyShooter() {
  const placeBet = useGameStore((s) => s.placeBet);
  const bets = useGameStore((s) => s.bets);
  const luckyShooterHits = useGameStore((s) => s.luckyShooterHits);
  const selectedChipValue = useGameStore((s) => s.selectedChipValue);
  const phase = useGameStore((s) => s.phase);

  const activeBet = bets.find((b) => b.type === BetType.LuckyShooter);
  const hitCount = luckyShooterHits.length;

  const handlePlaceBet = () => {
    if (!activeBet) {
      placeBet(BetType.LuckyShooter, selectedChipValue);
    }
  };

  return (
    <div className="lucky-shooter">
      <div className="ls-header">
        <span className="ls-title">LUCKY SHOOTER</span>
        {activeBet && (
          <span className="ls-bet-amount">${activeBet.amount}</span>
        )}
      </div>

      {/* Point number tracking display */}
      <div className="ls-points">
        {POINT_NUMBERS.map((num) => {
          const isHit = luckyShooterHits.includes(num);
          return (
            <div
              key={num}
              className={`ls-point ${isHit ? 'ls-point-hit' : ''} ${activeBet ? 'ls-point-active' : ''}`}
            >
              {num}
            </div>
          );
        })}
      </div>

      {/* Hit counter and payout info */}
      {activeBet && (
        <div className="ls-info">
          <span className="ls-hits">{hitCount} / 6 HITS</span>
          {hitCount >= 2 && LUCKY_SHOOTER_PAYOUTS[hitCount] && (
            <span className="ls-payout">
              PAYS {LUCKY_SHOOTER_PAYOUTS[hitCount].pays}:{LUCKY_SHOOTER_PAYOUTS[hitCount].per}
            </span>
          )}
        </div>
      )}

      {/* Payout table */}
      <div className="ls-payouts">
        {Object.entries(LUCKY_SHOOTER_PAYOUTS).map(([hits, odds]) => (
          <div
            key={hits}
            className={`ls-payout-row ${hitCount >= Number(hits) ? 'ls-payout-achieved' : ''}`}
          >
            <span>{hits} pts</span>
            <span>{odds.pays}:{odds.per}</span>
          </div>
        ))}
      </div>

      {/* Place bet button */}
      {!activeBet && (
        <button
          className="ls-place-btn"
          onClick={handlePlaceBet}
          disabled={phase !== 'COME_OUT'}
          title={phase !== 'COME_OUT' ? 'Can only place during come-out' : 'Place Lucky Shooter bet'}
        >
          BET ${selectedChipValue}
        </button>
      )}
    </div>
  );
}
