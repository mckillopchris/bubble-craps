// ============================================================
// Game State Machine
// ============================================================

import {
  type Bet,
  BetType,
  type DiceOutcome,
  type DiceTotal,
  type DieValue,
  GamePhase,
  type GameState,
  type PointNumber,
} from './types';

const POINT_NUMBERS = new Set<DiceTotal>([4, 5, 6, 8, 9, 10]);
const INITIAL_CREDITS = 1000;

/** Create a fresh game state */
export function createInitialState(credits: number = INITIAL_CREDITS): GameState {
  return {
    phase: GamePhase.ComeOut,
    point: null,
    bets: [],
    credits,
    rollHistory: [],
    comePoints: new Map(),
    dontComePoints: new Map(),
    rollsSinceHardWay: { 4: 0, 6: 0, 8: 0, 10: 0 },
    betsOn: true,
    lastBetConfig: [],
    lastWin: 0,
  };
}

/** Create a dice outcome from two die values */
export function createDiceOutcome(die1: DieValue, die2: DieValue): DiceOutcome {
  const total = (die1 + die2) as DiceTotal;
  return {
    die1,
    die2,
    total,
    isHardWay: die1 === die2,
  };
}

/** Roll two random dice */
export function rollDice(): DiceOutcome {
  const die1 = (Math.floor(Math.random() * 6) + 1) as DieValue;
  const die2 = (Math.floor(Math.random() * 6) + 1) as DieValue;
  return createDiceOutcome(die1, die2);
}

/** Check if a total is a point number */
export function isPointNumber(total: DiceTotal): total is PointNumber {
  return POINT_NUMBERS.has(total);
}

/** Check if a total is a craps number (2, 3, or 12) */
export function isCraps(total: DiceTotal): boolean {
  return total === 2 || total === 3 || total === 12;
}

/** Check if a total is natural (7 or 11 on come-out) */
export function isNatural(total: DiceTotal): boolean {
  return total === 7 || total === 11;
}

/** Transition the game state after a roll */
export function transitionPhase(state: GameState, outcome: DiceOutcome): GamePhase {
  if (state.phase === GamePhase.ComeOut) {
    if (isPointNumber(outcome.total)) {
      return GamePhase.Point;
    }
    // 2, 3, 7, 11, 12 on come-out: stay in come-out
    return GamePhase.ComeOut;
  }

  // Point phase
  if (outcome.total === 7 || outcome.total === state.point) {
    // 7-out or point made: back to come-out
    return GamePhase.ComeOut;
  }

  return GamePhase.Point;
}

/** Get the new point value after a roll */
export function getNewPoint(state: GameState, outcome: DiceOutcome): PointNumber | null {
  if (state.phase === GamePhase.ComeOut && isPointNumber(outcome.total)) {
    return outcome.total;
  }
  if (state.phase === GamePhase.Point) {
    if (outcome.total === 7 || outcome.total === state.point) {
      return null; // point cleared
    }
    return state.point;
  }
  return null;
}

/** Update hard way counters after a roll */
export function updateHardWayCounters(
  current: Record<4 | 6 | 8 | 10, number>,
  outcome: DiceOutcome
): Record<4 | 6 | 8 | 10, number> {
  const updated = { ...current };
  const hardWayTotals: (4 | 6 | 8 | 10)[] = [4, 6, 8, 10];

  for (const total of hardWayTotals) {
    if (outcome.isHardWay && outcome.total === total) {
      updated[total] = 0;
    } else {
      updated[total]++;
    }
  }

  return updated;
}

/** Process Come/Don't Come point establishment */
export function processComePoints(
  bets: Bet[],
  comePoints: Map<string, PointNumber>,
  dontComePoints: Map<string, PointNumber>,
  outcome: DiceOutcome
): { comePoints: Map<string, PointNumber>; dontComePoints: Map<string, PointNumber> } {
  const newComePoints = new Map(comePoints);
  const newDontComePoints = new Map(dontComePoints);

  if (!isPointNumber(outcome.total)) return { comePoints: newComePoints, dontComePoints: newDontComePoints };

  const pointNum = outcome.total;

  // Establish Come points for bets that don't have a point yet
  for (const bet of bets) {
    if (bet.type === BetType.Come && !newComePoints.has(bet.id)) {
      newComePoints.set(bet.id, pointNum);
    }
    if (bet.type === BetType.DontCome && !newDontComePoints.has(bet.id)) {
      newDontComePoints.set(bet.id, pointNum);
    }
  }

  return { comePoints: newComePoints, dontComePoints: newDontComePoints };
}

/** Generate a unique bet ID */
let betIdCounter = 0;
export function generateBetId(): string {
  return `bet_${++betIdCounter}`;
}

/** Reset the bet ID counter (for testing) */
export function resetBetIdCounter(): void {
  betIdCounter = 0;
}
