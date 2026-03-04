// ============================================================
// Last Roll Result - Shows outcome and bet resolutions
// ============================================================

import { BetResult } from '../../engine/types';
import { useGameStore } from '../../store/gameStore';
import './LastRollResult.css';

const BET_TYPE_LABELS: Record<string, string> = {
  PASS_LINE: 'Pass Line',
  DONT_PASS: "Don't Pass",
  PASS_LINE_ODDS: 'Pass Odds',
  DONT_PASS_ODDS: "DP Odds",
  COME: 'Come',
  DONT_COME: "Don't Come",
  COME_ODDS: 'Come Odds',
  DONT_COME_ODDS: "DC Odds",
  PLACE: 'Place',
  BUY: 'Buy',
  LAY: 'Lay',
  BIG_6: 'Big 6',
  BIG_8: 'Big 8',
  HARD_WAY: 'Hard Way',
  FIELD: 'Field',
  CRAPS_BET: 'Craps',
  ELEVEN: 'Eleven',
  CRAPS_ELEVEN: 'C&E',
  SEVEN: 'Seven',
  ANY_CRAPS: 'Any Craps',
  HORN_2: 'Horn 2',
  HORN_3: 'Horn 3',
  HORN_11: 'Horn 11',
  HORN_12: 'Horn 12',
  HORN_BET: 'Horn',
  HOP: 'Hop',
  HOPPING_HARD_WAY: 'Hop Hard',
};

export default function LastRollResult() {
  const lastResolutions = useGameStore((s) => s.lastResolutions);
  const rollHistory = useGameStore((s) => s.rollHistory);

  const lastRoll = rollHistory[0];
  const resolved = lastResolutions.filter((r) => r.result !== BetResult.Active);

  if (!lastRoll) return null;

  return (
    <div className="last-roll-result">
      <div className="last-roll-dice">
        <span className="die-face">{lastRoll.die1}</span>
        <span className="die-separator">+</span>
        <span className="die-face">{lastRoll.die2}</span>
        <span className="die-separator">=</span>
        <span className="roll-total">{lastRoll.total}</span>
      </div>

      {resolved.length > 0 && (
        <div className="resolution-list">
          {resolved.map((r, i) => (
            <div
              key={i}
              className={`resolution-item resolution-${r.result.toLowerCase()}`}
            >
              <span className="resolution-bet">
                {BET_TYPE_LABELS[r.bet.type] ?? r.bet.type}
                {r.bet.pointNumber ? ` (${r.bet.pointNumber})` : ''}
                {r.bet.hardWayTotal ? ` (${r.bet.hardWayTotal})` : ''}
              </span>
              <span className="resolution-result">
                {r.result === BetResult.Win && `+$${(r.payout - r.bet.amount).toFixed(2)}`}
                {r.result === BetResult.WinStay && `+$${r.payout.toFixed(2)}`}
                {r.result === BetResult.Lose && `-$${r.bet.amount.toFixed(2)}`}
                {r.result === BetResult.Push && 'PUSH'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
