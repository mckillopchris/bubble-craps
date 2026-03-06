// ============================================================
// Bubble Craps - Main Application (Interblock Layout)
// ============================================================

import { useRef, useCallback, useState, useEffect } from 'react';
import DiceRoller, { type DiceRollerRef } from './dice/DiceRoller';
import CrapsTable from './ui/table/CrapsTable';
import MachineHeader from './ui/layout/MachineHeader';
import BottomBar from './ui/layout/BottomBar';
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

  return (
    <div className="app interblock">
      <MachineHeader
        onShowHelp={() => setShowHelp(true)}
        onShowSettings={() => setShowSettings(true)}
      />

      <main className="app-main">
        {/* Upper area: Dice + Side Bets + Info */}
        <div className="upper-area">
          <div className="upper-left">
            <LuckyRoller />
          </div>

          <div className="upper-center">
            <DiceRoller
              ref={diceRollerRef}
              onRollComplete={handleRollComplete}
              width={280}
              height={220}
            />
          </div>

          <div className="upper-right">
            <LastRollResult />
            <LuckyShooter />
          </div>
        </div>

        {/* Main table */}
        <div className="table-area">
          <CrapsTable />
        </div>
      </main>

      <BottomBar onRoll={handleRollClick} />

      {/* Modals */}
      {showHelp && <HelpRules onClose={() => setShowHelp(false)} />}
      {showSettings && <SettingsMenu onClose={() => setShowSettings(false)} />}
    </div>
  );
}
