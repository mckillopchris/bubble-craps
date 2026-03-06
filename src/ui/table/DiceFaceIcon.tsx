// ============================================================
// DiceFaceIcon - Pure CSS die face with pip patterns
// Renders a small die showing 1-6 dots in standard layout
// Supports white (default) and red variants
// ============================================================

import './DiceFaceIcon.css';

type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

// Standard die pip positions in a 3x3 grid (row, col)
// Positions: TL=0,0  TC=0,1  TR=0,2  ML=1,0  MC=1,1  MR=1,2  BL=2,0  BC=2,1  BR=2,2
const PIP_POSITIONS: Record<DieValue, string[]> = {
  1: ['mc'],
  2: ['tr', 'bl'],
  3: ['tr', 'mc', 'bl'],
  4: ['tl', 'tr', 'bl', 'br'],
  5: ['tl', 'tr', 'mc', 'bl', 'br'],
  6: ['tl', 'ml', 'bl', 'tr', 'mr', 'br'],
};

interface DiceFaceIconProps {
  value: DieValue;
  size?: number;
  variant?: 'white' | 'red';
  className?: string;
}

export function DiceFaceIcon({ value, size = 18, variant = 'white', className = '' }: DiceFaceIconProps) {
  const pips = PIP_POSITIONS[value];
  return (
    <span
      className={`dfi dfi-${variant} ${className}`}
      style={{ '--dfi-size': `${size}px` } as React.CSSProperties}
    >
      {pips.map((pos, i) => (
        <span key={i} className={`dfi-pip dfi-${pos}`} />
      ))}
    </span>
  );
}

interface DicePairIconProps {
  die1: DieValue;
  die2: DieValue;
  size?: number;
  variant?: 'white' | 'red';
  className?: string;
}

export function DicePairIcon({ die1, die2, size = 16, variant = 'white', className = '' }: DicePairIconProps) {
  return (
    <span className={`dfi-pair ${className}`}>
      <DiceFaceIcon value={die1} size={size} variant={variant} />
      <DiceFaceIcon value={die2} size={size} variant={variant} />
    </span>
  );
}
