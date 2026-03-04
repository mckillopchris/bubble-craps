// ============================================================
// Help & Rules Modal - Bet explanations and payout tables
// ============================================================

import './HelpRules.css';

interface HelpRulesProps {
  onClose: () => void;
}

const BET_SECTIONS = [
  {
    title: 'Pass Line / Don\'t Pass',
    bets: [
      { name: 'Pass Line', desc: 'Come-out: 7/11 wins, 2/3/12 loses. Point phase: point wins, 7 loses.', payout: '1:1' },
      { name: 'Don\'t Pass', desc: 'Come-out: 2/3 wins, 12 pushes, 7/11 loses. Point phase: 7 wins, point loses.', payout: '1:1' },
      { name: 'Pass/DP Odds', desc: 'Taken after point established. Pays true odds.', payout: 'True odds' },
    ],
  },
  {
    title: 'Come / Don\'t Come',
    bets: [
      { name: 'Come', desc: 'Like Pass Line but placed after point. Establishes its own point.', payout: '1:1' },
      { name: 'Don\'t Come', desc: 'Like Don\'t Pass but placed after point. 12 pushes.', payout: '1:1' },
    ],
  },
  {
    title: 'Place / Buy / Lay',
    bets: [
      { name: 'Place', desc: 'Bet a specific number hits before 7. Better odds on 6 & 8.', payout: '9:5, 7:5, 7:6' },
      { name: 'Buy', desc: 'Like Place but pays true odds. 5% commission upfront.', payout: 'True odds' },
      { name: 'Lay', desc: 'Bet 7 hits before your number. 5% commission upfront.', payout: 'True odds' },
    ],
  },
  {
    title: 'Hard Ways',
    bets: [
      { name: 'Hard 4/10', desc: 'Exact doubles (2-2 or 5-5) before 7 or easy way.', payout: '7:1' },
      { name: 'Hard 6/8', desc: 'Exact doubles (3-3 or 4-4) before 7 or easy way.', payout: '9:1' },
    ],
  },
  {
    title: 'Single-Roll Bets',
    bets: [
      { name: 'Field', desc: '2,3,4,9,10,11,12 wins. 2 & 12 pay double.', payout: '1:1 / 2:1' },
      { name: 'Any 7', desc: 'Next roll is 7.', payout: '4:1' },
      { name: 'Any Craps', desc: 'Next roll is 2, 3, or 12.', payout: '7:1' },
      { name: 'C (Craps)', desc: 'Next roll is 2, 3, or 12.', payout: '7:1' },
      { name: 'E (Eleven)', desc: 'Next roll is 11.', payout: '15:1' },
      { name: 'Horn', desc: 'Split bet on 2, 3, 11, 12.', payout: '15:1 / 30:1' },
    ],
  },
  {
    title: 'Side Bets',
    bets: [
      { name: 'Lucky Shooter', desc: 'Track unique points hit during shooter turn. Place on come-out.', payout: '2:1 to 300:1' },
      { name: 'Lucky Roller Low', desc: 'Hit all of 2,3,4,5,6 before a 7.', payout: '34:1' },
      { name: 'Lucky Roller High', desc: 'Hit all of 8,9,10,11,12 before a 7.', payout: '34:1' },
      { name: 'Lucky Roller All', desc: 'Hit all 2-12 (except 7) before a 7.', payout: '175:1' },
    ],
  },
];

export default function HelpRules({ onClose }: HelpRulesProps) {
  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <h2>CRAPS RULES & PAYOUTS</h2>
          <button className="help-close" onClick={onClose}>&times;</button>
        </div>

        <div className="help-content">
          <div className="help-intro">
            <h3>HOW TO PLAY</h3>
            <p>
              The game starts with the <strong>come-out roll</strong>. Place your bets, then roll the dice.
              If a point number (4, 5, 6, 8, 9, 10) is rolled, it becomes the <strong>point</strong>.
              Keep rolling until the point is made (win) or 7 is rolled (lose).
            </p>
          </div>

          {BET_SECTIONS.map((section) => (
            <div key={section.title} className="help-section">
              <h3>{section.title}</h3>
              <table className="help-table">
                <thead>
                  <tr>
                    <th>Bet</th>
                    <th>Description</th>
                    <th>Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {section.bets.map((bet) => (
                    <tr key={bet.name}>
                      <td className="help-bet-name">{bet.name}</td>
                      <td className="help-bet-desc">{bet.desc}</td>
                      <td className="help-bet-payout">{bet.payout}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
