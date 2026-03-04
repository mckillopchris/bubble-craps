// ============================================================
// Place-to-Buy Transfer Popup
// Offered when a Place bet wins on come-out, allowing player
// to transfer winnings to a Buy bet on another point
// ============================================================

import { BetType, type PointNumber } from '../../engine/types';
import { BUY_PAYOUTS, calculatePayout, calculateCommission } from '../../engine/bets';
import { useGameStore } from '../../store/gameStore';
import './PlaceToBuyTransfer.css';

interface PlaceToBuyTransferProps {
  wonPointNumber: PointNumber;
  winAmount: number;
  onClose: () => void;
}

const POINT_NUMBERS: PointNumber[] = [4, 5, 6, 8, 9, 10];

export default function PlaceToBuyTransfer({ wonPointNumber, winAmount, onClose }: PlaceToBuyTransferProps) {
  const placeBet = useGameStore((s) => s.placeBet);
  const point = useGameStore((s) => s.point);

  const availablePoints = POINT_NUMBERS.filter((n) => n !== wonPointNumber && n !== point);

  const handleTransfer = (targetPoint: PointNumber) => {
    placeBet(BetType.Buy, winAmount, targetPoint);
    onClose();
  };

  return (
    <div className="transfer-overlay" onClick={onClose}>
      <div className="transfer-popup" onClick={(e) => e.stopPropagation()}>
        <h3 className="transfer-title">Transfer to Buy?</h3>
        <p className="transfer-desc">
          Your Place {wonPointNumber} won ${winAmount}. Transfer to a Buy bet?
        </p>
        <div className="transfer-options">
          {availablePoints.map((num) => {
            const buyOdds = BUY_PAYOUTS[num];
            const commission = calculateCommission(winAmount);
            const potentialWin = calculatePayout(winAmount, buyOdds);
            return (
              <button
                key={num}
                className="transfer-option"
                onClick={() => handleTransfer(num)}
              >
                <span className="transfer-num">Buy {num}</span>
                <span className="transfer-detail">
                  Pays {buyOdds.pays}:{buyOdds.per} | Win ${potentialWin.toFixed(0)} | Comm ${commission}
                </span>
              </button>
            );
          })}
        </div>
        <button className="transfer-skip" onClick={onClose}>
          NO THANKS - KEEP WINNINGS
        </button>
      </div>
    </div>
  );
}
