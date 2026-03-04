// ============================================================
// Lucky Roller Side Bet Component
// Three sub-bets: Low Rolls, High Rolls, Roll 'Em All
// Track dice totals hit since last 7
// ============================================================

import { BetType, type DiceTotal } from '../../engine/types';
import {
  LUCKY_ROLLER_LOW_TARGETS,
  LUCKY_ROLLER_HIGH_TARGETS,
  LUCKY_ROLLER_ALL_TARGETS,
  LUCKY_ROLLER_LOW_PAYOUT,
  LUCKY_ROLLER_HIGH_PAYOUT,
  LUCKY_ROLLER_ALL_PAYOUT,
} from '../../engine/bets';
import { useGameStore } from '../../store/gameStore';
import './LuckyRoller.css';

interface RollerBetConfig {
  type: BetType;
  label: string;
  targets: number[];
  payout: { pays: number; per: number };
}

const ROLLER_BETS: RollerBetConfig[] = [
  {
    type: BetType.LuckyRollerLow,
    label: 'LOW',
    targets: LUCKY_ROLLER_LOW_TARGETS,
    payout: LUCKY_ROLLER_LOW_PAYOUT,
  },
  {
    type: BetType.LuckyRollerHigh,
    label: 'HIGH',
    targets: LUCKY_ROLLER_HIGH_TARGETS,
    payout: LUCKY_ROLLER_HIGH_PAYOUT,
  },
  {
    type: BetType.LuckyRollerAll,
    label: 'ALL',
    targets: LUCKY_ROLLER_ALL_TARGETS,
    payout: LUCKY_ROLLER_ALL_PAYOUT,
  },
];

// All trackable totals (2-12 except 7)
const ALL_TOTALS: DiceTotal[] = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12];

export default function LuckyRoller() {
  const placeBet = useGameStore((s) => s.placeBet);
  const bets = useGameStore((s) => s.bets);
  const luckyRollerHits = useGameStore((s) => s.luckyRollerHits);
  const selectedChipValue = useGameStore((s) => s.selectedChipValue);

  const hitSet = new Set(luckyRollerHits);

  return (
    <div className="lucky-roller">
      <div className="lr-header">
        <span className="lr-title">LUCKY ROLLER</span>
      </div>

      {/* Number tracking grid */}
      <div className="lr-numbers">
        {ALL_TOTALS.map((num) => {
          const isHit = hitSet.has(num);
          const isLow = LUCKY_ROLLER_LOW_TARGETS.includes(num);
          const isHigh = LUCKY_ROLLER_HIGH_TARGETS.includes(num);
          return (
            <div
              key={num}
              className={`lr-number ${isHit ? 'lr-number-hit' : ''} ${isLow ? 'lr-number-low' : ''} ${isHigh ? 'lr-number-high' : ''}`}
            >
              {num}
            </div>
          );
        })}
      </div>

      {/* Three sub-bets */}
      <div className="lr-bets">
        {ROLLER_BETS.map((config) => {
          const activeBet = bets.find((b) => b.type === config.type);
          const hitsNeeded = config.targets.length;
          const hitsAchieved = config.targets.filter((t) => hitSet.has(t as DiceTotal)).length;

          return (
            <div key={config.type} className={`lr-bet-row ${activeBet ? 'lr-bet-active' : ''}`}>
              <div className="lr-bet-info">
                <span className="lr-bet-label">{config.label}</span>
                <span className="lr-bet-odds">{config.payout.pays}:{config.payout.per}</span>
                {activeBet && (
                  <span className="lr-bet-progress">
                    {hitsAchieved}/{hitsNeeded}
                  </span>
                )}
              </div>
              {activeBet ? (
                <span className="lr-bet-amount">${activeBet.amount}</span>
              ) : (
                <button
                  className="lr-place-btn"
                  onClick={() => placeBet(config.type, selectedChipValue)}
                  title={`Place Lucky Roller ${config.label} bet`}
                >
                  ${selectedChipValue}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
