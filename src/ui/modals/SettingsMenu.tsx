// ============================================================
// Settings Menu - Sound, display options, and preferences
// ============================================================

import { useGameStore } from '../../store/gameStore';
import { soundManager } from '../../audio/SoundManager';
import './SettingsMenu.css';

interface SettingsMenuProps {
  onClose: () => void;
}

export default function SettingsMenu({ onClose }: SettingsMenuProps) {
  const showWinnings = useGameStore((s) => s.showWinnings);
  const showHints = useGameStore((s) => s.showHints);
  const showBetLimits = useGameStore((s) => s.showBetLimits);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const setShowWinnings = useGameStore((s) => s.setShowWinnings);
  const setShowHints = useGameStore((s) => s.setShowHints);
  const setShowBetLimits = useGameStore((s) => s.setShowBetLimits);
  const setSoundEnabled = useGameStore((s) => s.setSoundEnabled);

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    soundManager.setEnabled(enabled);
    if (enabled) {
      soundManager.play('buttonClick');
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>SETTINGS</h2>
          <button className="settings-close" onClick={onClose}>&times;</button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>AUDIO</h3>
            <label className="settings-toggle">
              <span>Sound Effects</span>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => handleSoundToggle(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="settings-section">
            <h3>DISPLAY</h3>
            <label className="settings-toggle">
              <span>Show Potential Winnings</span>
              <input
                type="checkbox"
                checked={showWinnings}
                onChange={(e) => setShowWinnings(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
            <label className="settings-toggle">
              <span>Show Hints</span>
              <input
                type="checkbox"
                checked={showHints}
                onChange={(e) => setShowHints(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
            <label className="settings-toggle">
              <span>Show Bet Limits</span>
              <input
                type="checkbox"
                checked={showBetLimits}
                onChange={(e) => setShowBetLimits(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
