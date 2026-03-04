// ============================================================
// BetChip - Visual chip on the table representing a bet amount
// ============================================================

import { getChipColorForAmount, isLightChip } from './chipConstants';
import './BetChip.css';

interface BetChipProps {
  amount: number;
  size?: number;
}

export default function BetChip({ amount, size = 30 }: BetChipProps) {
  const chipColor = getChipColorForAmount(amount);
  const darkText = isLightChip(amount);

  return (
    <span
      className="bet-chip"
      style={{
        '--bet-chip-color': chipColor,
        '--bet-chip-size': `${size}px`,
        '--bet-chip-text': darkText ? '#333' : '#fff',
      } as React.CSSProperties}
    >
      <span className="bet-chip-value">${amount}</span>
    </span>
  );
}
