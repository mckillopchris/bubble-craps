// ============================================================
// Bubble Craps - Main Application
// ============================================================

import { useRef, useCallback, useState, useEffect } from 'react';
import DiceRoller, { type DiceRollerRef } from './dice/DiceRoller';
import CrapsTable from './ui/table/CrapsTable';
import ChipRack from './ui/chips/ChipRack';
import GameControls from './ui/controls/GameControls';
import SpecialButtons from './ui/controls/SpecialButtons';
import GameHUD from './ui/display/GameHUD';
import RollHistory from './ui/display/RollHistory';
import LastRollResult from './ui/display/LastRollResult';
import LuckyShooter from './ui/sidebets/LuckyShooter';
import LuckyRoller from './ui/sidebets/LuckyRoller';
import HelpRules from './ui/modals/HelpRules';
import SettingsMenu from './ui/modals/SettingsMenu';
import { useGameStore } from './store/gameStore';
import { soundManager } from './audio/SoundManager';
import type { DiceOutcome } from './engine/types';
import './App.css';

export default function App() {
  const diceRollerRef = useRef<DiceRollerRef>(null);
  const completeRoll = useGameStore((s) => s.completeRoll);
  const startRoll = useGameStore((s) => s.startRoll);
  const isRolling = useGameStore((s) => s.isRolling);
  const lastWin = useGameStore((s) => s.lastWin);
  const prevLastWin = useRef(0);

  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Play win/lose sound after roll completes
  useEffect(() => {
    if (!isRolling && prevLastWin.current !== lastWin) {
      if (lastWin > 0) {
        soundManager.play('winChime');
      }
      prevLastWin.current = lastWin;
    }
  }, [isRolling, lastWin]);

  const handleRollComplete = useCallback(
    (outcome: DiceOutcome) => {
      soundManager.play('diceSettle');
      completeRoll(outcome);
    },
    [completeRoll]
  );

  const handleRollClick = useCallback(() => {
    soundManager.play('diceRattle');
    startRoll();
    diceRollerRef.current?.roll();
  }, [startRoll]);

  const bets = useGameStore((s) => s.bets);
  const hasBets = bets.length > 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">BUBBLE CRAPS</h1>
        <div className="header-buttons">
          <button className="header-btn" onClick={() => setShowHelp(true)} title="Help & Rules">?</button>
          <button className="header-btn" onClick={() => setShowSettings(true)} title="Settings">&#9881;</button>
        </div>
      </header>

      <main className="app-main">
        <div className="game-layout">
          {/* Left sidebar - Roll History & Side Bets */}
          <aside className="sidebar sidebar-left">
            <RollHistory />
            <LuckyShooter />
            <LuckyRoller />
          </aside>

          {/* Center - Main game area */}
          <div className="game-center">
            {/* HUD */}
            <GameHUD />

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

      {/* Modals */}
      {showHelp && <HelpRules onClose={() => setShowHelp(false)} />}
      {showSettings && <SettingsMenu onClose={() => setShowSettings(false)} />}
    </div>
  );
}
