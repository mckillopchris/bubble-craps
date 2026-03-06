// ============================================================
// Craps Table Layout - Interblock-style grid
// Left: Hardways + One-Roll | C/C&E/E | Special Btns | Main Grid (upper: LAY/Numbers/Place-Buy + DC vertical | lower: Come/Field/Pass) | Win Condition
// ============================================================

import { useCallback, useState } from 'react';
import { BetType, GamePhase, type PointNumber, type DiceCombination } from '../../engine/types';
import { useGameStore } from '../../store/gameStore';
import { soundManager } from '../../audio/SoundManager';
import BetChip from '../chips/BetChip';
import WinConditionPanel from './WinConditionPanel';
import { DiceFaceIcon, DicePairIcon } from './DiceFaceIcon';
import OddsPopup from '../modals/OddsPopup';
import CommissionConfirm from '../modals/CommissionConfirm';
import './CrapsTable.css';

const POINT_NUMBERS: PointNumber[] = [4, 5, 6, 8, 9, 10];

const POINT_LABELS: Record<number, string> = {
  4: '4', 5: '5', 6: 'SIX', 8: '8', 9: 'NINE', 10: '10',
};

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
  const isRolling = useGameStore((s) => s.isRolling);
  const betsOn = useGameStore((s) => s.betsOn);
  const toggleBetsOnOff = useGameStore((s) => s.toggleBetsOnOff);

  // Special buttons store actions
  const pressLastPoint = useGameStore((s) => s.pressLastPoint);
  const placeBetsAcross = useGameStore((s) => s.placeBetsAcross);
  const placeBetsInside = useGameStore((s) => s.placeBetsInside);
  const placeBetsOutside = useGameStore((s) => s.placeBetsOutside);

  const hasPoint = phase === GamePhase.Point && point !== null;

  // Modal state
  const [oddsPopup, setOddsPopup] = useState<{ betType: 'pass' | 'dontPass'; baseBetAmount: number } | null>(null);
  const [pendingCommission, setPendingCommission] = useState<PendingCommission | null>(null);

  // Left panel tab state
  const [leftTab, setLeftTab] = useState<'hardways' | 'hopbets'>('hardways');

  const handleBetClick = useCallback(
    (type: BetType, pointNumber?: PointNumber, hardWayTotal?: 4 | 6 | 8 | 10, diceCombination?: DiceCombination) => {
      if (type === BetType.Buy || type === BetType.Lay) {
        if (pointNumber) {
          setPendingCommission({ betType: type as BetType.Buy | BetType.Lay, pointNumber, amount: selectedChipValue });
        }
        return;
      }
      const placed = placeBet(type, selectedChipValue, pointNumber, hardWayTotal, diceCombination);
      if (placed) soundManager.play('chipPlace');
    },
    [placeBet, selectedChipValue]
  );

  const getBetTotal = (type: BetType, pointNumber?: PointNumber, hardWayTotal?: 4 | 6 | 8 | 10, diceCombination?: DiceCombination) => {
    return bets
      .filter(
        (b) =>
          b.type === type &&
          (pointNumber === undefined || b.pointNumber === pointNumber) &&
          (hardWayTotal === undefined || b.hardWayTotal === hardWayTotal) &&
          (diceCombination === undefined || (
            b.diceCombination &&
            b.diceCombination.die1 === diceCombination.die1 &&
            b.diceCombination.die2 === diceCombination.die2
          ))
      )
      .reduce((sum, b) => sum + b.amount, 0);
  };

  const passLineBet = bets.find((b) => b.type === BetType.PassLine);
  const dontPassBet = bets.find((b) => b.type === BetType.DontPass);
  const hasPassOdds = bets.some((b) => b.type === BetType.PassLineOdds);
  const hasDontPassOdds = bets.some((b) => b.type === BetType.DontPassOdds);

  return (
    <div className="craps-table">
      {/* ===== LEFT PANEL: Hardways + One-Roll OR Hop Bets ===== */}
      <div className="table-left-panel">
        {/* Tab headers */}
        <div className="section-tabs">
          <button
            className={`section-tab ${leftTab === 'hardways' ? 'section-tab-active' : ''}`}
            onClick={() => setLeftTab('hardways')}
          >
            HARDWAYS
            <span className="tab-amount">
              ${bets.filter(b => b.type === BetType.HardWay).reduce((s, b) => s + b.amount, 0).toFixed(2)}
            </span>
          </button>
          <button
            className={`section-tab ${leftTab === 'hopbets' ? 'section-tab-active' : ''}`}
            onClick={() => setLeftTab('hopbets')}
          >
            HOP BETS
            <span className="tab-amount">
              ${bets.filter(b => b.type === BetType.Hop || b.type === BetType.HoppingHardWay).reduce((s, b) => s + b.amount, 0).toFixed(2)}
            </span>
          </button>
        </div>

        {leftTab === 'hardways' ? (
          <>
            {/* Hard Ways */}
            <div className="section-header">HARD WAYS <span className="section-sub">(# of rolls since last)</span></div>
            <div className="hw-grid">
              {([4, 6, 8, 10] as const).map((hw) => (
                <button
                  key={`hw-${hw}`}
                  className="bet-area hard-way"
                  onClick={() => handleBetClick(BetType.HardWay, undefined, hw)}
                  title={`Hard ${hw}`}
                >
                  <DicePairIcon die1={(hw / 2) as 1|2|3|4|5|6} die2={(hw / 2) as 1|2|3|4|5|6} size={28} variant="red" />
                  <span className="hw-counter-badge">#{rollsSinceHardWay[hw]}</span>
                  <span className="hw-payout">{hw === 4 || hw === 10 ? '8 FOR 1' : '10 FOR 1'}</span>
                  {getBetTotal(BetType.HardWay, undefined, hw) > 0 && (
                    <BetChip amount={getBetTotal(BetType.HardWay, undefined, hw)} size={24} />
                  )}
                </button>
              ))}
            </div>

            {/* One-Roll Bets */}
            <div className="section-header">ONE ROLL BETS</div>

            <button className="bet-area orl-seven" onClick={() => handleBetClick(BetType.Seven)} title="Seven">
              <span className="orl-odds">5 FOR 1</span>
              <span className="orl-dot">&middot;</span>
              <span className="bet-label">SEVEN</span>
              <span className="orl-dot">&middot;</span>
              <span className="orl-odds">5 FOR 1</span>
              {getBetTotal(BetType.Seven) > 0 && <BetChip amount={getBetTotal(BetType.Seven)} size={22} />}
            </button>

            {/* Horn Bets - paired rows: top (2 + 3), HORN BET, bottom (12 + 11) */}
            <div className="horn-row">
              <button className="bet-area orl-horn" onClick={() => handleBetClick(BetType.Horn2)} title="Horn 2">
                <DicePairIcon die1={1} die2={1} size={22} variant="red" />
                {getBetTotal(BetType.Horn2) > 0 && <BetChip amount={getBetTotal(BetType.Horn2)} size={20} />}
              </button>
              <div className="horn-odds-col">
                <span className="orl-odds">31 FOR 1</span>
                <span className="orl-odds">16 FOR 1</span>
              </div>
              <button className="bet-area orl-horn" onClick={() => handleBetClick(BetType.Horn3)} title="Horn 3">
                <DicePairIcon die1={1} die2={2} size={22} variant="red" />
                {getBetTotal(BetType.Horn3) > 0 && <BetChip amount={getBetTotal(BetType.Horn3)} size={20} />}
              </button>
            </div>

            <button className="bet-area orl-horn-bet" onClick={() => handleBetClick(BetType.HornBet)} title="Horn Bet">
              <span className="bet-label">HORN BET</span>
              {getBetTotal(BetType.HornBet) > 0 && <BetChip amount={getBetTotal(BetType.HornBet)} size={22} />}
            </button>

            <div className="horn-row">
              <button className="bet-area orl-horn" onClick={() => handleBetClick(BetType.Horn12)} title="Horn 12">
                <DicePairIcon die1={6} die2={6} size={22} variant="red" />
                {getBetTotal(BetType.Horn12) > 0 && <BetChip amount={getBetTotal(BetType.Horn12)} size={20} />}
              </button>
              <div className="horn-odds-col">
                <span className="orl-odds">31 FOR 1</span>
                <span className="orl-odds">16 FOR 1</span>
              </div>
              <button className="bet-area orl-horn" onClick={() => handleBetClick(BetType.Horn11)} title="Horn 11">
                <DicePairIcon die1={5} die2={6} size={22} variant="red" />
                {getBetTotal(BetType.Horn11) > 0 && <BetChip amount={getBetTotal(BetType.Horn11)} size={20} />}
              </button>
            </div>

            <button className="bet-area orl-any-craps" onClick={() => handleBetClick(BetType.AnyCraps)} title="Any Craps">
              <span className="orl-odds">8 FOR 1</span>
              <span className="orl-dot">&middot;</span>
              <span className="bet-label">ANY CRAPS</span>
              <span className="orl-dot">&middot;</span>
              <span className="orl-odds">8 FOR 1</span>
              {getBetTotal(BetType.AnyCraps) > 0 && <BetChip amount={getBetTotal(BetType.AnyCraps)} size={22} />}
            </button>
          </>
        ) : (
          <>
            {/* HOP BETS TAB */}
            {/* Hopping Hard Ways: 1-1, 2-2, 3-3, 4-4, 5-5, 6-6 */}
            <div className="section-header">HOPPING HARD WAYS <span className="section-sub">31 FOR 1</span></div>
            <div className="hop-hw-grid">
              {([1, 2, 3, 4, 5, 6] as const).map((die) => {
                const combo: DiceCombination = { die1: die, die2: die };
                const total = getBetTotal(BetType.HoppingHardWay, undefined, undefined, combo);
                return (
                  <button
                    key={`hop-hw-${die}`}
                    className="bet-area hop-hw-btn"
                    onClick={() => handleBetClick(BetType.HoppingHardWay, undefined, undefined, combo)}
                    title={`Hopping ${die}-${die}`}
                  >
                    <DicePairIcon die1={die} die2={die} size={22} variant="red" />
                    <span className="hop-total">{die + die}</span>
                    {total > 0 && <BetChip amount={total} size={20} />}
                  </button>
                );
              })}
            </div>

            {/* Hop Bets (easy ways): all non-pair dice combinations */}
            <div className="section-header">HOP BETS <span className="section-sub">16 FOR 1</span></div>
            <div className="hop-easy-grid">
              {([
                [1, 2], [1, 3], [1, 4], [1, 5], [1, 6],
                [2, 3], [2, 4], [2, 5], [2, 6],
                [3, 4], [3, 5], [3, 6],
                [4, 5], [4, 6],
                [5, 6],
              ] as [1|2|3|4|5|6, 1|2|3|4|5|6][]).map(([d1, d2]) => {
                const combo: DiceCombination = { die1: d1, die2: d2 };
                const total = getBetTotal(BetType.Hop, undefined, undefined, combo);
                return (
                  <button
                    key={`hop-${d1}-${d2}`}
                    className="bet-area hop-easy-btn"
                    onClick={() => handleBetClick(BetType.Hop, undefined, undefined, combo)}
                    title={`Hop ${d1}-${d2}`}
                  >
                    <div className="hop-dice-row">
                      <DiceFaceIcon value={d1} size={20} variant="white" />
                      <DiceFaceIcon value={d2} size={20} variant="white" />
                    </div>
                    <span className="hop-total">{d1 + d2}</span>
                    {total > 0 && <BetChip amount={total} size={18} />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ===== C / C&E / E COLUMN ===== */}
      <div className="table-cce-col">
        <button className="bet-area cce-btn" onClick={() => handleBetClick(BetType.Craps)} title="Craps (C)">
          C
          {getBetTotal(BetType.Craps) > 0 && <BetChip amount={getBetTotal(BetType.Craps)} size={20} />}
        </button>
        <button className="bet-area cce-btn" onClick={() => handleBetClick(BetType.CrapsEleven)} title="Craps & Eleven">
          C&E
          {getBetTotal(BetType.CrapsEleven) > 0 && <BetChip amount={getBetTotal(BetType.CrapsEleven)} size={20} />}
        </button>
        <button className="bet-area cce-btn" onClick={() => handleBetClick(BetType.Eleven)} title="Eleven (E)">
          E
          {getBetTotal(BetType.Eleven) > 0 && <BetChip amount={getBetTotal(BetType.Eleven)} size={20} />}
        </button>
      </div>

      {/* ===== SPECIAL BUTTONS COLUMN ===== */}
      <div className="table-special-col">
        <button
          className={`bet-area bets-toggle ${betsOn ? 'bets-on' : 'bets-off'}`}
          onClick={toggleBetsOnOff}
          disabled={isRolling}
          title="Toggle bets on/off"
        >
          SET BETS<br />{betsOn ? 'ON' : 'OFF'}
        </button>

        <button className="special-btn" onClick={pressLastPoint} disabled={isRolling || !hasPoint} title="Press">PRESS</button>
        <button className="special-btn" onClick={placeBetsAcross} disabled={isRolling} title="Across">ACROSS</button>
        <button className="special-btn" onClick={placeBetsInside} disabled={isRolling} title="Inside">INSIDE</button>
        <button className="special-btn" onClick={placeBetsOutside} disabled={isRolling} title="Outside">OUTSIDE</button>
      </div>

      {/* ===== MAIN GRID ===== */}
      <div className="table-main-grid">
        {/* UPPER SECTION: LAY + Numbers + Place/Buy + DON'T COME vertical */}
        <div className="table-upper-section">
          <div className="table-upper-grid">
            {/* Point Numbers with LAY overlay in top-right */}
            <div className="grid-row numbers-row">
              {POINT_NUMBERS.map((num) => {
                const comeTotal = bets
                  .filter((b) => b.type === BetType.Come && comePoints.get(b.id) === num)
                  .reduce((s, b) => s + b.amount, 0);
                const dontComeTotal = bets
                  .filter((b) => b.type === BetType.DontCome && dontComePoints.get(b.id) === num)
                  .reduce((s, b) => s + b.amount, 0);

                return (
                  <div key={`num-${num}`} className={`point-cell ${point === num ? 'point-active' : ''}`}>
                    {point === num && <div className="puck puck-on">ON</div>}
                    <button
                      className="bet-area lay-overlay"
                      onClick={(e) => { e.stopPropagation(); handleBetClick(BetType.Lay, num); }}
                      title={`Lay ${num}`}
                    >
                      LAY
                      {getBetTotal(BetType.Lay, num) > 0 && <BetChip amount={getBetTotal(BetType.Lay, num)} size={18} />}
                    </button>
                    <span className={`point-number-large ${num === 6 || num === 9 ? 'point-italic' : ''}`}>
                      {POINT_LABELS[num]}
                    </span>
                    {(comeTotal > 0 || dontComeTotal > 0) && (
                      <div className="come-point-indicators">
                        {comeTotal > 0 && <div className="come-point-chip come">C ${comeTotal}</div>}
                        {dontComeTotal > 0 && <div className="come-point-chip dc">DC ${dontComeTotal}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Row 3: PLACE / BUY pairs */}
            <div className="grid-row place-buy-row">
              {POINT_NUMBERS.map((num) => (
                <div key={`pb-${num}`} className="place-buy-cell">
                  <button
                    className="bet-area pb-btn place-bet"
                    onClick={() => handleBetClick(BetType.Place, num)}
                    title={`Place ${num}`}
                  >
                    PLACE
                    {getBetTotal(BetType.Place, num) > 0 && <BetChip amount={getBetTotal(BetType.Place, num)} size={20} />}
                  </button>
                  <button
                    className="bet-area pb-btn buy-bet"
                    onClick={() => handleBetClick(BetType.Buy, num)}
                    title={`Buy ${num}`}
                  >
                    BUY
                    {getBetTotal(BetType.Buy, num) > 0 && <BetChip amount={getBetTotal(BetType.Buy, num)} size={20} />}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right strip: DON'T COME BAR (vertical) + Big 6/8 */}
          <div className="table-right-strip">
            <button
              className="bet-area dont-come-col"
              onClick={() => handleBetClick(BetType.DontCome)}
              title="Don't Come"
            >
              <span className="dc-text-vertical">DON&apos;T COME BAR</span>
              <DicePairIcon die1={6} die2={6} size={14} variant="red" />
              {getBetTotal(BetType.DontCome) > 0 && <BetChip amount={getBetTotal(BetType.DontCome)} size={24} />}
            </button>
            <div className="big-68-area">
              <button
                className="bet-area big-68-btn"
                onClick={() => handleBetClick(BetType.Big6)}
                title="Big 6"
              >
                <span className="big-68-number">6</span>
                {getBetTotal(BetType.Big6) > 0 && <BetChip amount={getBetTotal(BetType.Big6)} size={20} />}
              </button>
              <button
                className="bet-area big-68-btn"
                onClick={() => handleBetClick(BetType.Big8)}
                title="Big 8"
              >
                <span className="big-68-number">8</span>
                {getBetTotal(BetType.Big8) > 0 && <BetChip amount={getBetTotal(BetType.Big8)} size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* LOWER SECTION: COME, FIELD, DON'T PASS, PASS LINE */}
        <div className="table-lower-section">
          {/* COME */}
          <button
            className="bet-area full-row come-area"
            onClick={() => handleBetClick(BetType.Come)}
            title="Come"
          >
            <span className="bet-label">COME</span>
            {getBetTotal(BetType.Come) > 0 && <BetChip amount={getBetTotal(BetType.Come)} />}
          </button>

          {/* FIELD */}
          <button
            className="bet-area full-row field-area"
            onClick={() => handleBetClick(BetType.Field)}
            title="Field"
          >
            <span className="field-numbers">
              <span className="field-double-wrap"><span className="field-double">2</span><span className="pays-double-badge">PAYS<br/>DOUBLE</span></span>
              <span>&middot; 3 &middot; 4 &middot; 9 &middot; 10 &middot; 11 &middot;</span>
              <span className="field-triple-wrap"><span className="field-triple">12</span><span className="pays-double-badge">PAYS<br/>DOUBLE</span></span>
            </span>
            <span className="bet-label">FIELD</span>
            {getBetTotal(BetType.Field) > 0 && <BetChip amount={getBetTotal(BetType.Field)} />}
          </button>

          {/* DON'T PASS BAR + ODDS */}
          <div className="grid-row dont-pass-row">
            <button
              className="bet-area dont-pass-bar"
              onClick={() => handleBetClick(BetType.DontPass)}
              title="Don't Pass"
            >
              <span className="bet-label">DON'T PASS BAR</span>
              <DicePairIcon die1={6} die2={6} size={14} variant="red" />
              {getBetTotal(BetType.DontPass) > 0 && <BetChip amount={getBetTotal(BetType.DontPass)} />}
            </button>
            <button
              className={`bet-area dp-odds-btn ${phase === GamePhase.Point && dontPassBet && !hasDontPassOdds ? 'odds-available' : ''}`}
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
              {getBetTotal(BetType.DontPassOdds) > 0 && <BetChip amount={getBetTotal(BetType.DontPassOdds)} size={24} />}
            </button>
          </div>

          {/* PASS LINE + ODDS */}
          <div className="grid-row pass-line-row">
            <button
              className="bet-area pass-line-area"
              onClick={() => handleBetClick(BetType.PassLine)}
              title="Pass Line"
            >
              <span className="bet-label">PASS LINE</span>
              {getBetTotal(BetType.PassLine) > 0 && <BetChip amount={getBetTotal(BetType.PassLine)} />}
            </button>
            <button
              className={`bet-area pass-odds-btn ${phase === GamePhase.Point && passLineBet && !hasPassOdds ? 'odds-available' : ''}`}
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
              {getBetTotal(BetType.PassLineOdds) > 0 && <BetChip amount={getBetTotal(BetType.PassLineOdds)} size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL: Win Condition ===== */}
      <WinConditionPanel />

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
