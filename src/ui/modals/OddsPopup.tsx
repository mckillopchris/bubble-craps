// ============================================================
// Odds Multiplier Popup
// Shows after point is established to let player place odds bets
// ============================================================

import { useState } from 'react';
import { BetType, type PointNumber } from '../../engine/types';
import { MAX_ODDS_MULTIPLIERS, PASS_ODDS_PAYOUTS, DONT_PASS_ODDS_PAYOUTS } from '../../engine/bets';
import { useGameStore } from '../../store/gameStore';
import './OddsPopup.css';

interface OddsPopupProps {
  betType: 'pass' | 'dontPass';
  point: PointNumber;
  baseBetAmount: number;
  onClose: () => void;
}

export default function OddsPopup({ betType, point, baseBetAmount, onClose }: OddsPopupProps) {
  const placeBet = useGameStore((s) => s.placeBet);
  const credits = useGameStore((s) => s.credits);
  const maxMultiplier = MAX_ODDS_MULTIPLIERS[point];
  const maxOdds = baseBetAmount * maxMultiplier;
  const [oddsAmount, setOddsAmount] = useState(baseBetAmount);

  const isPass = betType === 'pass';
  const oddsType = isPass ? BetType.PassLineOdds : BetType.DontPassOdds;
  const payoutTable = isPass ? PASS_ODDS_PAYOUTS : DONT_PASS_ODDS_PAYOUTS;
  const payout = payoutTable[point];
  const potentialWin = (oddsAmount * payout.pays) / payout.per;

  const multipliers = Array.from({ length: maxMultiplier }, (_, i) => i + 1);

  const handlePlace = () => {
    if (oddsAmount > 0 && oddsAmount <= credits) {
      placeBet(oddsType, oddsAmount);
      onClose();
    }
  };

  return (
    <div className="odds-overlay" onClick={onClose}>
      <div className="odds-popup" onClick={(e) => e.stopPropagation()}>
        <h3 className="odds-title">
          {isPass ? 'Pass Line' : "Don't Pass"} Odds
        </h3>
        <div className="odds-info">
          <span>Point: <strong>{point}</strong></span>
          <span>Pays: <strong>{payout.pays}:{payout.per}</strong></span>
          <span>Max: <strong>{maxMultiplier}x ({maxOdds})</strong></span>
        </div>

        <div className="odds-multipliers">
          {multipliers.map((m) => {
            const amt = baseBetAmount * m;
            return (
              <button
                key={m}
                className={`odds-mult-btn ${oddsAmount === amt ? 'selected' : ''}`}
                onClick={() => setOddsAmount(amt)}
                disabled={amt > credits}
              >
                {m}x (${amt})
              </button>
            );
          })}
        </div>

        <div className="odds-potential">
          Potential win: <strong>${potentialWin.toFixed(0)}</strong>
        </div>

        <div className="odds-actions">
          <button className="odds-btn odds-place" onClick={handlePlace} disabled={oddsAmount > credits}>
            PLACE ${oddsAmount} ODDS
          </button>
          <button className="odds-btn odds-skip" onClick={onClose}>
            NO ODDS
          </button>
        </div>
      </div>
    </div>
  );
}
