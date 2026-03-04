// ============================================================
// Commission Confirmation Modal
// Shows before placing Buy/Lay bets to confirm 5% commission
// ============================================================

import { BetType, type PointNumber } from '../../engine/types';
import { calculateCommission, BUY_PAYOUTS, LAY_PAYOUTS, calculatePayout } from '../../engine/bets';
import { useGameStore } from '../../store/gameStore';
import './CommissionConfirm.css';

interface CommissionConfirmProps {
  betType: BetType.Buy | BetType.Lay;
  pointNumber: PointNumber;
  amount: number;
  onClose: () => void;
}

export default function CommissionConfirm({ betType, pointNumber, amount, onClose }: CommissionConfirmProps) {
  const placeBet = useGameStore((s) => s.placeBet);
  const commission = calculateCommission(amount);
  const isBuy = betType === BetType.Buy;
  const payoutTable = isBuy ? BUY_PAYOUTS : LAY_PAYOUTS;
  const odds = payoutTable[pointNumber];
  const potentialWin = calculatePayout(amount, odds);

  const handleConfirm = () => {
    placeBet(betType, amount, pointNumber);
    onClose();
  };

  return (
    <div className="commission-overlay" onClick={onClose}>
      <div className="commission-popup" onClick={(e) => e.stopPropagation()}>
        <h3 className="commission-title">
          {isBuy ? 'Buy' : 'Lay'} {pointNumber} - Commission
        </h3>
        <div className="commission-details">
          <div className="commission-row">
            <span>Bet Amount:</span>
            <strong>${amount}</strong>
          </div>
          <div className="commission-row">
            <span>Commission (5%):</span>
            <strong className="commission-amount">${commission}</strong>
          </div>
          <div className="commission-row">
            <span>Total Cost:</span>
            <strong>${amount + commission}</strong>
          </div>
          <div className="commission-row">
            <span>Pays:</span>
            <strong>{odds.pays}:{odds.per}</strong>
          </div>
          <div className="commission-row">
            <span>Potential Win:</span>
            <strong className="commission-win">${potentialWin.toFixed(0)}</strong>
          </div>
        </div>
        <div className="commission-actions">
          <button className="commission-btn confirm" onClick={handleConfirm}>
            CONFIRM ${amount + commission}
          </button>
          <button className="commission-btn cancel" onClick={onClose}>
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
