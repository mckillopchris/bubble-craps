// ============================================================
// Machine Header - Interblock-style top bar
// ============================================================

import { useGameStore } from '../../store/gameStore';
import './MachineHeader.css';

interface MachineHeaderProps {
  onShowHelp: () => void;
  onShowSettings: () => void;
}

export default function MachineHeader({ onShowHelp, onShowSettings }: MachineHeaderProps) {
  const credits = useGameStore((s) => s.credits);

  return (
    <div className="machine-header">
      <div className="mh-left">
        <button className="mh-btn mh-cashout" title="Cash Out">CASHOUT</button>
        <div className="mh-credit">
          <span className="mh-credit-label">CREDIT</span>
          <span className="mh-credit-value">${credits.toFixed(2)}</span>
        </div>
      </div>

      <div className="mh-center">
        <span className="mh-game-name">CRAPS</span>
        <span className="mh-max-bet">Max total bet: $1,000</span>
      </div>

      <div className="mh-right">
        <button className="mh-btn" onClick={onShowSettings} title="Settings">
          <span className="mh-icon">&#9881;</span>
        </button>
        <button className="mh-btn mh-help" onClick={onShowHelp} title="Help & Rules">
          HELP
        </button>
      </div>
    </div>
  );
}
