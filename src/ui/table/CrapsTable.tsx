// ============================================================
// Craps Table Layout - Full betting surface with modals
// ============================================================

import { useCallback, useState } from 'react';
import { BetType, GamePhase, type PointNumber, type DiceCombination } from '../../engine/types';
import { useGameStore } from '../../store/gameStore';
import { soundManager } from '../../audio/SoundManager';
import BetChip from '../chips/BetChip';
import OddsPopup from '../modals/OddsPopup';
import CommissionConfirm from '../modals/CommissionConfirm';
import './CrapsTable.css';

const POINT_NUMBERS: PointNumber[] = [4, 5, 6, 8, 9, 10];

interface PendingCommission {
  betType: BetType.Buy | BetType.Lay;
  pointNumber: PointNumber;
  amount: number;
}

export default function CrapsTable() {
  const placeBet = useGameStore((s) => s.placeBet);
  const bets = useGameStore((s) => s.bets);
  const point = useGameStore((s) => s.point);
  const phase = useGameStore((s) => s.phase);
  const selectedChipValue = useGameStore((s) => s.selectedChipValue);
  const comePoints = useGameStore((s) => s.comePoints);
  const dontComePoints = useGameStore((s) => s.dontComePoints);
  const rollsSinceHardWay = useGameStore((s) => s.rollsSinceHardWay);

  // Modal state
  const [oddsPopup, setOddsPopup] = useState<{ betType: 'pass' | 'dontPass'; baseBetAmount: number } | null>(null);
  const [pendingCommission, setPendingCommission] = useState<PendingCommission | null>(null);

  const handleBetClick = useCallback(
    (type: BetType, pointNumber?: PointNumber, hardWayTotal?: 4 | 6 | 8 | 10, _diceCombination?: DiceCombination) => {
      // Intercept Buy/Lay bets to show commission confirmation
      if (type === BetType.Buy || type === BetType.Lay) {
        if (pointNumber) {
          setPendingCommission({ betType: type as BetType.Buy | BetType.Lay, pointNumber, amount: selectedChipValue });
        }
        return;
      }
      const placed = placeBet(type, selectedChipValue, pointNumber, hardWayTotal);
      if (placed) soundManager.play('chipPlace');
    },
    [placeBet, selectedChipValue]
  );

  const getBetTotal = (type: BetType, pointNumber?: PointNumber, hardWayTotal?: 4 | 6 | 8 | 10) => {
    return bets
      .filter(
        (b) =>
          b.type === type &&
          (pointNumber === undefined || b.pointNumber === pointNumber) &&
          (hardWayTotal === undefined || b.hardWayTotal === hardWayTotal)
      )
      .reduce((sum, b) => sum + b.amount, 0);
  };

  // Check if player has Pass Line / Don't Pass bet for odds popup trigger
  const passLineBet = bets.find((b) => b.type === BetType.PassLine);
  const dontPassBet = bets.find((b) => b.type === BetType.DontPass);
  const hasPassOdds = bets.some((b) => b.type === BetType.PassLineOdds);
  const hasDontPassOdds = bets.some((b) => b.type === BetType.DontPassOdds);

  return (
    <div className="craps-table">
      {/* Point numbers row */}
      <div className="table-section point-numbers">
        {POINT_NUMBERS.map((num) => {
          const comeTotal = bets
            .filter((b) => b.type === BetType.Come && comePoints.get(b.id) === num)
            .reduce((s, b) => s + b.amount, 0);
          const dontComeTotal = bets
            .filter((b) => b.type === BetType.DontCome && dontComePoints.get(b.id) === num)
            .reduce((s, b) => s + b.amount, 0);

          return (
            <div key={num} className="point-column">
              <div className={`point-header ${point === num ? 'point-active' : ''}`}>
                {point === num && <div className="puck puck-on">ON</div>}
                <span className="point-number">{num}</span>
              </div>

              {/* Come/Don't Come point indicators */}
              {(comeTotal > 0 || dontComeTotal > 0) && (
                <div className="come-point-indicators">
                  {comeTotal > 0 && (
                    <div className="come-point-chip come">C ${comeTotal}</div>
                  )}
                  {dontComeTotal > 0 && (
                    <div className="come-point-chip dc">DC ${dontComeTotal}</div>
                  )}
                </div>
              )}

              {/* Place bet area */}
              <button
                className="bet-area place-bet"
                onClick={() => handleBetClick(BetType.Place, num)}
                title={`Place ${num}`}
              >
                <span className="bet-label">PLACE</span>
                {getBetTotal(BetType.Place, num) > 0 && (
                  <BetChip amount={getBetTotal(BetType.Place, num)} />
                )}
              </button>

              {/* Buy bet area */}
              <button
                className="bet-area buy-bet"
                onClick={() => handleBetClick(BetType.Buy, num)}
                title={`Buy ${num}`}
              >
                <span className="bet-label">BUY</span>
                {getBetTotal(BetType.Buy, num) > 0 && (
                  <BetChip amount={getBetTotal(BetType.Buy, num)} />
                )}
              </button>

              {/* Lay bet area */}
              <button
                className="bet-area lay-bet"
                onClick={() => handleBetClick(BetType.Lay, num)}
                title={`Lay ${num}`}
              >
                <span className="bet-label">LAY</span>
                {getBetTotal(BetType.Lay, num) > 0 && (
                  <BetChip amount={getBetTotal(BetType.Lay, num)} />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Main betting area */}
      <div className="table-section main-bets">
        {/* Pass Line */}
        <button
          className="bet-area pass-line"
          onClick={() => handleBetClick(BetType.PassLine)}
          title="Pass Line"
        >
          <span className="bet-label">PASS LINE</span>
          {getBetTotal(BetType.PassLine) > 0 && (
            <BetChip amount={getBetTotal(BetType.PassLine)} />
          )}
        </button>

        {/* Don't Pass */}
        <button
          className="bet-area dont-pass"
          onClick={() => handleBetClick(BetType.DontPass)}
          title="Don't Pass"
        >
          <span className="bet-label">DON'T PASS</span>
          {getBetTotal(BetType.DontPass) > 0 && (
            <BetChip amount={getBetTotal(BetType.DontPass)} />
          )}
        </button>

        {/* Pass Line Odds */}
        <button
          className={`bet-area pass-odds ${phase === GamePhase.Point && passLineBet && !hasPassOdds ? 'odds-available' : ''}`}
          onClick={() => {
            if (phase === GamePhase.Point && passLineBet && !hasPassOdds && point) {
              setOddsPopup({ betType: 'pass', baseBetAmount: passLineBet.amount });
            } else {
              handleBetClick(BetType.PassLineOdds);
            }
          }}
          title="Pass Line Odds"
        >
          <span className="bet-label">ODDS</span>
          {getBetTotal(BetType.PassLineOdds) > 0 && (
            <BetChip amount={getBetTotal(BetType.PassLineOdds)} />
          )}
        </button>

        {/* Don't Pass Odds */}
        <button
          className={`bet-area dont-pass-odds ${phase === GamePhase.Point && dontPassBet && !hasDontPassOdds ? 'odds-available' : ''}`}
          onClick={() => {
            if (phase === GamePhase.Point && dontPassBet && !hasDontPassOdds && point) {
              setOddsPopup({ betType: 'dontPass', baseBetAmount: dontPassBet.amount });
            } else {
              handleBetClick(BetType.DontPassOdds);
            }
          }}
          title="Don't Pass Odds"
        >
          <span className="bet-label">DP ODDS</span>
          {getBetTotal(BetType.DontPassOdds) > 0 && (
            <BetChip amount={getBetTotal(BetType.DontPassOdds)} />
          )}
        </button>

        {/* Come */}
        <button
          className="bet-area come-bet"
          onClick={() => handleBetClick(BetType.Come)}
          title="Come"
        >
          <span className="bet-label">COME</span>
          {getBetTotal(BetType.Come) > 0 && (
            <BetChip amount={getBetTotal(BetType.Come)} />
          )}
        </button>

        {/* Don't Come */}
        <button
          className="bet-area dont-come"
          onClick={() => handleBetClick(BetType.DontCome)}
          title="Don't Come"
        >
          <span className="bet-label">DON'T COME</span>
          {getBetTotal(BetType.DontCome) > 0 && (
            <BetChip amount={getBetTotal(BetType.DontCome)} />
          )}
        </button>

        {/* Field */}
        <button
          className="bet-area field-bet"
          onClick={() => handleBetClick(BetType.Field)}
          title="Field"
        >
          <span className="bet-label">FIELD</span>
          <span className="field-numbers">2 3 4 9 10 11 12</span>
          {getBetTotal(BetType.Field) > 0 && (
            <BetChip amount={getBetTotal(BetType.Field)} />
          )}
        </button>
      </div>

      {/* Center proposition bets */}
      <div className="table-section prop-bets">
        <div className="prop-row">
          {/* Hard Ways with roll counters */}
          {([4, 6, 8, 10] as const).map((hw) => (
            <button
              key={`hw-${hw}`}
              className="bet-area hard-way"
              onClick={() => handleBetClick(BetType.HardWay, undefined, hw)}
              title={`Hard ${hw}`}
            >
              <span className="bet-label">HARD {hw}</span>
              <span className="hw-counter">{rollsSinceHardWay[hw]} rolls</span>
              {getBetTotal(BetType.HardWay, undefined, hw) > 0 && (
                <BetChip amount={getBetTotal(BetType.HardWay, undefined, hw)} />
              )}
            </button>
          ))}
        </div>

        <div className="prop-row">
          <button className="bet-area prop-c" onClick={() => handleBetClick(BetType.Craps)} title="Craps (C)">
            <span className="bet-label">C</span>
            {getBetTotal(BetType.Craps) > 0 && <BetChip amount={getBetTotal(BetType.Craps)} />}
          </button>
          <button className="bet-area prop-e" onClick={() => handleBetClick(BetType.Eleven)} title="Eleven (E)">
            <span className="bet-label">E</span>
            {getBetTotal(BetType.Eleven) > 0 && <BetChip amount={getBetTotal(BetType.Eleven)} />}
          </button>
          <button className="bet-area prop-ce" onClick={() => handleBetClick(BetType.CrapsEleven)} title="Craps & Eleven">
            <span className="bet-label">C&E</span>
            {getBetTotal(BetType.CrapsEleven) > 0 && <BetChip amount={getBetTotal(BetType.CrapsEleven)} />}
          </button>
          <button className="bet-area prop-seven" onClick={() => handleBetClick(BetType.Seven)} title="Seven">
            <span className="bet-label">7</span>
            {getBetTotal(BetType.Seven) > 0 && <BetChip amount={getBetTotal(BetType.Seven)} />}
          </button>
          <button className="bet-area prop-any-craps" onClick={() => handleBetClick(BetType.AnyCraps)} title="Any Craps">
            <span className="bet-label">ANY CRAPS</span>
            {getBetTotal(BetType.AnyCraps) > 0 && <BetChip amount={getBetTotal(BetType.AnyCraps)} />}
          </button>
        </div>

        <div className="prop-row">
          {([
            [BetType.Horn2, '2', 'Snake Eyes'],
            [BetType.Horn3, '3', 'Ace-Deuce'],
            [BetType.Horn11, '11', 'Yo'],
            [BetType.Horn12, '12', 'Boxcars'],
            [BetType.HornBet, 'HORN', 'Horn Bet'],
          ] as const).map(([type, label, title]) => (
            <button
              key={type}
              className="bet-area horn-bet"
              onClick={() => handleBetClick(type)}
              title={title}
            >
              <span className="bet-label">{label}</span>
              {getBetTotal(type) > 0 && <BetChip amount={getBetTotal(type)} />}
            </button>
          ))}
        </div>

        <div className="prop-row">
          <button className="bet-area big-bet" onClick={() => handleBetClick(BetType.Big6)} title="Big 6">
            <span className="bet-label">BIG 6</span>
            {getBetTotal(BetType.Big6) > 0 && <BetChip amount={getBetTotal(BetType.Big6)} />}
          </button>
          <button className="bet-area big-bet" onClick={() => handleBetClick(BetType.Big8)} title="Big 8">
            <span className="bet-label">BIG 8</span>
            {getBetTotal(BetType.Big8) > 0 && <BetChip amount={getBetTotal(BetType.Big8)} />}
          </button>
        </div>
      </div>

      {/* Modals */}
      {oddsPopup && point && (
        <OddsPopup
          betType={oddsPopup.betType}
          point={point}
          baseBetAmount={oddsPopup.baseBetAmount}
          onClose={() => setOddsPopup(null)}
        />
      )}

      {pendingCommission && (
        <CommissionConfirm
          betType={pendingCommission.betType}
          pointNumber={pendingCommission.pointNumber}
          amount={pendingCommission.amount}
          onClose={() => setPendingCommission(null)}
        />
      )}
    </div>
  );
}
