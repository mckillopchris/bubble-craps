import { describe, it, expect, beforeEach } from 'vitest';
import { resolveBet } from '../resolver';
import { createInitialState, createDiceOutcome, generateBetId, resetBetIdCounter } from '../state';
import { BetType, BetResult, GamePhase, type Bet, type GameState } from '../types';

function makeBet(overrides: Partial<Bet> = {}): Bet {
  return {
    id: generateBetId(),
    type: BetType.PassLine,
    amount: 10,
    isOn: true,
    isContract: false,
    commissionPaid: 0,
    ...overrides,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), ...overrides };
}

beforeEach(() => {
  resetBetIdCounter();
});

// ============================================================
// PASS LINE
// ============================================================
describe('Pass Line', () => {
  it('wins on 7 come-out', () => {
    const bet = makeBet({ type: BetType.PassLine, isContract: true });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(3, 4);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    expect(result.payout).toBe(20); // 10 bet + 10 win
  });

  it('wins on 11 come-out', () => {
    const bet = makeBet({ type: BetType.PassLine, isContract: true });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(5, 6);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    expect(result.payout).toBe(20);
  });

  it('loses on 2 come-out', () => {
    const bet = makeBet({ type: BetType.PassLine, isContract: true });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(1, 1);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Lose);
    expect(result.payout).toBe(0);
  });

  it('loses on 3 come-out', () => {
    const bet = makeBet({ type: BetType.PassLine, isContract: true });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(1, 2);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Lose);
  });

  it('loses on 12 come-out', () => {
    const bet = makeBet({ type: BetType.PassLine, isContract: true });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(6, 6);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Lose);
  });

  it('stays active when point established', () => {
    const bet = makeBet({ type: BetType.PassLine, isContract: true });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(2, 4); // 6
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Active);
  });

  it('wins when point is made', () => {
    const bet = makeBet({ type: BetType.PassLine, isContract: true });
    const state = makeState({ phase: GamePhase.Point, point: 8, bets: [bet] });
    const outcome = createDiceOutcome(4, 4); // 8
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    expect(result.payout).toBe(20);
  });

  it('loses on 7-out', () => {
    const bet = makeBet({ type: BetType.PassLine, isContract: true });
    const state = makeState({ phase: GamePhase.Point, point: 8, bets: [bet] });
    const outcome = createDiceOutcome(3, 4); // 7
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Lose);
    expect(result.payout).toBe(0);
  });
});

// ============================================================
// DON'T PASS
// ============================================================
describe("Don't Pass", () => {
  it('wins on 2 come-out', () => {
    const bet = makeBet({ type: BetType.DontPass });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(1, 1);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    expect(result.payout).toBe(20);
  });

  it('wins on 3 come-out', () => {
    const bet = makeBet({ type: BetType.DontPass });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(1, 2);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
  });

  it('pushes on 12 (bar 12)', () => {
    const bet = makeBet({ type: BetType.DontPass });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(6, 6);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Push);
    expect(result.payout).toBe(10); // bet returned
  });

  it('loses on 7 come-out', () => {
    const bet = makeBet({ type: BetType.DontPass });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(3, 4);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Lose);
  });

  it('loses on 11 come-out', () => {
    const bet = makeBet({ type: BetType.DontPass });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(5, 6);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Lose);
  });

  it('wins on 7-out', () => {
    const bet = makeBet({ type: BetType.DontPass });
    const state = makeState({ phase: GamePhase.Point, point: 8, bets: [bet] });
    const outcome = createDiceOutcome(3, 4);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
  });

  it('loses when point made', () => {
    const bet = makeBet({ type: BetType.DontPass });
    const state = makeState({ phase: GamePhase.Point, point: 8, bets: [bet] });
    const outcome = createDiceOutcome(4, 4);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Lose);
  });
});

// ============================================================
// PASS LINE ODDS
// ============================================================
describe('Pass Line Odds', () => {
  it('wins with correct payout on point 4', () => {
    const bet = makeBet({ type: BetType.PassLineOdds, amount: 10 });
    const state = makeState({ phase: GamePhase.Point, point: 4, bets: [bet] });
    const outcome = createDiceOutcome(2, 2);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    expect(result.payout).toBe(30); // 10 + (10 * 2/1)
  });

  it('wins with correct payout on point 6', () => {
    const bet = makeBet({ type: BetType.PassLineOdds, amount: 10 });
    const state = makeState({ phase: GamePhase.Point, point: 6, bets: [bet] });
    const outcome = createDiceOutcome(2, 4);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    expect(result.payout).toBe(22); // 10 + (10 * 6/5)
  });

  it('loses on 7-out', () => {
    const bet = makeBet({ type: BetType.PassLineOdds, amount: 10 });
    const state = makeState({ phase: GamePhase.Point, point: 6, bets: [bet] });
    const outcome = createDiceOutcome(3, 4);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Lose);
  });
});

// ============================================================
// FIELD
// ============================================================
describe('Field', () => {
  it('wins on 2 with double payout', () => {
    const bet = makeBet({ type: BetType.Field, amount: 10 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(1, 1);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    expect(result.payout).toBe(30); // 10 + (10 * 2/1)
  });

  it('wins on 12 with double payout', () => {
    const bet = makeBet({ type: BetType.Field, amount: 10 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(6, 6);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    expect(result.payout).toBe(30);
  });

  it('wins on 3 with even money', () => {
    const bet = makeBet({ type: BetType.Field, amount: 10 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(1, 2);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    expect(result.payout).toBe(20);
  });

  it('loses on 7', () => {
    const bet = makeBet({ type: BetType.Field, amount: 10 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(3, 4);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Lose);
  });

  it('loses on 5', () => {
    const bet = makeBet({ type: BetType.Field, amount: 10 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(2, 3);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Lose);
  });
});

// ============================================================
// HARD WAYS
// ============================================================
describe('Hard Ways', () => {
  it('wins on hard 4 (2-2)', () => {
    const bet = makeBet({ type: BetType.HardWay, hardWayTotal: 4 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(2, 2);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    expect(result.payout).toBe(80); // 10 + (10 * 7)
  });

  it('loses on easy 4 (1-3)', () => {
    const bet = makeBet({ type: BetType.HardWay, hardWayTotal: 4 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(1, 3);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Lose);
  });

  it('loses on 7', () => {
    const bet = makeBet({ type: BetType.HardWay, hardWayTotal: 8 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(3, 4);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Lose);
  });

  it('stays active on unrelated number', () => {
    const bet = makeBet({ type: BetType.HardWay, hardWayTotal: 8 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(1, 1); // 2
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Active);
  });
});

// ============================================================
// PLACE
// ============================================================
describe('Place', () => {
  it('wins on point 6 with correct payout', () => {
    const bet = makeBet({ type: BetType.Place, pointNumber: 6, amount: 6 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(2, 4);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    expect(result.payout).toBe(13); // 6 + (6 * 7/6)
  });

  it('loses on 7', () => {
    const bet = makeBet({ type: BetType.Place, pointNumber: 6 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(3, 4);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Lose);
  });

  it('stays active on unrelated number', () => {
    const bet = makeBet({ type: BetType.Place, pointNumber: 6 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(4, 4); // 8
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Active);
  });
});

// ============================================================
// SEVEN
// ============================================================
describe('Seven', () => {
  it('wins on 7 with 4:1 payout', () => {
    const bet = makeBet({ type: BetType.Seven, amount: 10 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(3, 4);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    expect(result.payout).toBe(50); // 10 + (10 * 4)
  });

  it('loses on non-7', () => {
    const bet = makeBet({ type: BetType.Seven, amount: 10 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(2, 4);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Lose);
  });
});

// ============================================================
// ANY CRAPS
// ============================================================
describe('Any Craps', () => {
  it('wins on 2', () => {
    const bet = makeBet({ type: BetType.AnyCraps, amount: 10 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(1, 1);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    expect(result.payout).toBe(80); // 10 + (10 * 7)
  });

  it('wins on 3', () => {
    const bet = makeBet({ type: BetType.AnyCraps, amount: 10 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(1, 2);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
  });

  it('wins on 12', () => {
    const bet = makeBet({ type: BetType.AnyCraps, amount: 10 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(6, 6);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
  });

  it('loses on 7', () => {
    const bet = makeBet({ type: BetType.AnyCraps, amount: 10 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(3, 4);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Lose);
  });
});

// ============================================================
// HORN
// ============================================================
describe('Horn', () => {
  it('Horn 2 wins on snake eyes (30:1)', () => {
    const bet = makeBet({ type: BetType.Horn2, amount: 10 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(1, 1);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    expect(result.payout).toBe(310); // 10 + (10 * 30)
  });

  it('Horn 11 wins on Yo (15:1)', () => {
    const bet = makeBet({ type: BetType.Horn11, amount: 10 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(5, 6);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    expect(result.payout).toBe(160); // 10 + (10 * 15)
  });

  it('Horn bet splits 4 ways and pays correctly on 12', () => {
    const bet = makeBet({ type: BetType.HornBet, amount: 4 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(6, 6);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    // $1 on each of 2,3,11,12. 12 wins at 30:1 = $31.
    // Lose $3 on the other three. Net = $31 - $3 = $28
    expect(result.payout).toBe(28);
  });
});

// ============================================================
// C&E
// ============================================================
describe('C&E', () => {
  it('wins on craps (3:1)', () => {
    const bet = makeBet({ type: BetType.CrapsEleven, amount: 10 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(1, 2); // 3
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    expect(result.payout).toBe(40); // 10 + (10 * 3)
  });

  it('wins on 11 (7:1)', () => {
    const bet = makeBet({ type: BetType.CrapsEleven, amount: 10 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(5, 6); // 11
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    expect(result.payout).toBe(80); // 10 + (10 * 7)
  });

  it('loses on 7', () => {
    const bet = makeBet({ type: BetType.CrapsEleven, amount: 10 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(3, 4);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Lose);
  });
});

// ============================================================
// BIG 6 / BIG 8
// ============================================================
describe('Big 6/8', () => {
  it('Big 6 wins on 6', () => {
    const bet = makeBet({ type: BetType.Big6, amount: 10 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(2, 4);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    expect(result.payout).toBe(20);
  });

  it('Big 8 wins on 8', () => {
    const bet = makeBet({ type: BetType.Big8, amount: 10 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(4, 4);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
    expect(result.payout).toBe(20);
  });

  it('Big 6 loses on 7', () => {
    const bet = makeBet({ type: BetType.Big6, amount: 10 });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(3, 4);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Lose);
  });
});

// ============================================================
// COME / DON'T COME
// ============================================================
describe('Come', () => {
  it('wins on 7 (first roll, no come point)', () => {
    const bet = makeBet({ type: BetType.Come });
    const state = makeState({
      phase: GamePhase.Point,
      point: 6,
      bets: [bet],
      comePoints: new Map(),
    });
    const outcome = createDiceOutcome(3, 4);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
  });

  it('loses on craps (first roll, no come point)', () => {
    const bet = makeBet({ type: BetType.Come });
    const state = makeState({
      phase: GamePhase.Point,
      point: 6,
      bets: [bet],
      comePoints: new Map(),
    });
    const outcome = createDiceOutcome(1, 1);
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Lose);
  });

  it('wins when come point made', () => {
    const bet = makeBet({ type: BetType.Come, id: 'come_1' });
    const comePoints = new Map([['come_1', 9 as const]]);
    const state = makeState({
      phase: GamePhase.Point,
      point: 6,
      bets: [bet],
      comePoints,
    });
    const outcome = createDiceOutcome(4, 5); // 9
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
  });

  it('loses on 7-out with come point', () => {
    const bet = makeBet({ type: BetType.Come, id: 'come_1' });
    const comePoints = new Map([['come_1', 9 as const]]);
    const state = makeState({
      phase: GamePhase.Point,
      point: 6,
      bets: [bet],
      comePoints,
    });
    const outcome = createDiceOutcome(3, 4); // 7
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Lose);
  });
});

// ============================================================
// OFF BETS
// ============================================================
describe('Off bets', () => {
  it('off bet stays active regardless of outcome', () => {
    const bet = makeBet({ type: BetType.Place, pointNumber: 6, isOn: false });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(2, 4); // 6
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Active);
  });

  it('contract bet still resolves when off', () => {
    const bet = makeBet({ type: BetType.PassLine, isOn: false, isContract: true });
    const state = makeState({ bets: [bet] });
    const outcome = createDiceOutcome(3, 4); // 7
    const result = resolveBet(bet, state, outcome);
    expect(result.result).toBe(BetResult.Win);
  });
});
