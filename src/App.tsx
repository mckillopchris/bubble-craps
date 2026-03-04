// ============================================================
// Bubble Craps - Main Application
// ============================================================

import { useRef, useCallback } from 'react';
import DiceRoller, { type DiceRollerRef } from './dice/DiceRoller';
import CrapsTable from './ui/table/CrapsTable';
import ChipRack from './ui/chips/ChipRack';
import GameControls from './ui/controls/GameControls';
import SpecialButtons from './ui/controls/SpecialButtons';
import GameHUD from './ui/display/GameHUD';
import BettingTimer from './ui/display/BettingTimer';
import RollHistory from './ui/display/RollHistory';
import LastRollResult from './ui/display/LastRollResult';
import { useGameStore } from './store/gameStore';
import type { DiceOutcome } from './engine/types';
import './App.css';

export default function App() {
  const diceRollerRef = useRef<DiceRollerRef>(null);
  const completeRoll = useGameStore((s) => s.completeRoll);
  const startRoll = useGameStore((s) => s.startRoll);
  const isRolling = useGameStore((s) => s.isRolling);

  const handleRollComplete = useCallback(
    (outcome: DiceOutcome) => {
      completeRoll(outcome);
    },
    [completeRoll]
  );

  const handleRollClick = useCallback(() => {
    startRoll();
    diceRollerRef.current?.roll();
  }, [startRoll]);

  const bets = useGameStore((s) => s.bets);
  const hasBets = bets.length > 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">BUBBLE CRAPS</h1>
      </header>

      <main className="app-main">
        <div className="game-layout">
          {/* Left sidebar - Roll History */}
          <aside className="sidebar sidebar-left">
            <RollHistory />
          </aside>

          {/* Center - Main game area */}
          <div className="game-center">
            {/* HUD */}
            <GameHUD />

            {/* Betting Timer */}
            <BettingTimer />

            {/* Dice Roller */}
            <div className="dice-area">
              <DiceRoller
                ref={diceRollerRef}
                onRollComplete={handleRollComplete}
                width={400}
                height={350}
              />
            </div>

            {/* Roll button */}
            <div className="roll-area">
              <button
                className="main-roll-btn"
                onClick={handleRollClick}
                disabled={isRolling || !hasBets}
              >
                {isRolling ? 'ROLLING...' : 'ROLL'}
              </button>
            </div>

            {/* Craps Table */}
            <CrapsTable />

            {/* Special Buttons */}
            <SpecialButtons />

            {/* Chip Rack */}
            <ChipRack />

            {/* Game Controls */}
            <GameControls />
          </div>

          {/* Right sidebar - Last Roll Result */}
          <aside className="sidebar sidebar-right">
            <LastRollResult />
          </aside>
        </div>
      </main>
    </div>
  );
}
