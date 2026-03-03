// ============================================================
// Chip Rack - Selectable denomination chips
// ============================================================

import { useGameStore } from '../../store/gameStore';
import './ChipRack.css';

const CHIP_VALUES = [1, 5, 10, 25, 100, 500];

const CHIP_COLORS: Record<number, string> = {
  1: '#f0f0f0',
  5: '#cc3333',
  10: '#3366cc',
  25: '#33aa33',
  100: '#111111',
  500: '#9933cc',
};

export default function ChipRack() {
  const selectedChipValue = useGameStore((s) => s.selectedChipValue);
  const setSelectedChip = useGameStore((s) => s.setSelectedChip);
  const credits = useGameStore((s) => s.credits);

  return (
    <div className="chip-rack">
      {CHIP_VALUES.map((value) => (
        <button
          key={value}
          className={`chip ${selectedChipValue === value ? 'chip-selected' : ''} ${
            value > credits ? 'chip-disabled' : ''
          }`}
          style={{
            '--chip-color': CHIP_COLORS[value],
            '--chip-border': value === 1 ? '#999' : CHIP_COLORS[value],
          } as React.CSSProperties}
          onClick={() => setSelectedChip(value)}
          disabled={value > credits}
          title={`$${value} chip`}
        >
          <span className="chip-value">${value}</span>
        </button>
      ))}
    </div>
  );
}
