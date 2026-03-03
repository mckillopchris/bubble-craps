import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInitialState,
  createDiceOutcome,
  isPointNumber,
  isCraps,
  isNatural,
  transitionPhase,
  getNewPoint,
  updateHardWayCounters,
  resetBetIdCounter,
} from '../state';
import { GamePhase } from '../types';

beforeEach(() => {
  resetBetIdCounter();
});

describe('createInitialState', () => {
  it('creates state with correct defaults', () => {
    const state = createInitialState(500);
    expect(state.phase).toBe(GamePhase.ComeOut);
    expect(state.point).toBeNull();
    expect(state.credits).toBe(500);
    expect(state.bets).toHaveLength(0);
    expect(state.rollHistory).toHaveLength(0);
    expect(state.betsOn).toBe(true);
    expect(state.lastWin).toBe(0);
  });
});

describe('createDiceOutcome', () => {
  it('calculates total correctly', () => {
    const outcome = createDiceOutcome(3, 4);
    expect(outcome.total).toBe(7);
    expect(outcome.die1).toBe(3);
    expect(outcome.die2).toBe(4);
    expect(outcome.isHardWay).toBe(false);
  });

  it('identifies hard ways', () => {
    const outcome = createDiceOutcome(5, 5);
    expect(outcome.total).toBe(10);
    expect(outcome.isHardWay).toBe(true);
  });

  it('handles snake eyes', () => {
    const outcome = createDiceOutcome(1, 1);
    expect(outcome.total).toBe(2);
    expect(outcome.isHardWay).toBe(true);
  });

  it('handles boxcars', () => {
    const outcome = createDiceOutcome(6, 6);
    expect(outcome.total).toBe(12);
    expect(outcome.isHardWay).toBe(true);
  });
});

describe('isPointNumber', () => {
  it('returns true for point numbers', () => {
    expect(isPointNumber(4)).toBe(true);
    expect(isPointNumber(5)).toBe(true);
    expect(isPointNumber(6)).toBe(true);
    expect(isPointNumber(8)).toBe(true);
    expect(isPointNumber(9)).toBe(true);
    expect(isPointNumber(10)).toBe(true);
  });

  it('returns false for non-point numbers', () => {
    expect(isPointNumber(2)).toBe(false);
    expect(isPointNumber(3)).toBe(false);
    expect(isPointNumber(7)).toBe(false);
    expect(isPointNumber(11)).toBe(false);
    expect(isPointNumber(12)).toBe(false);
  });
});

describe('isCraps', () => {
  it('identifies craps numbers', () => {
    expect(isCraps(2)).toBe(true);
    expect(isCraps(3)).toBe(true);
    expect(isCraps(12)).toBe(true);
  });

  it('rejects non-craps numbers', () => {
    expect(isCraps(7)).toBe(false);
    expect(isCraps(11)).toBe(false);
    expect(isCraps(6)).toBe(false);
  });
});

describe('isNatural', () => {
  it('identifies naturals', () => {
    expect(isNatural(7)).toBe(true);
    expect(isNatural(11)).toBe(true);
  });

  it('rejects non-naturals', () => {
    expect(isNatural(2)).toBe(false);
    expect(isNatural(6)).toBe(false);
  });
});

describe('transitionPhase', () => {
  it('stays in come-out on natural', () => {
    const state = createInitialState();
    const outcome = createDiceOutcome(3, 4); // 7
    expect(transitionPhase(state, outcome)).toBe(GamePhase.ComeOut);
  });

  it('stays in come-out on craps', () => {
    const state = createInitialState();
    const outcome = createDiceOutcome(1, 1); // 2
    expect(transitionPhase(state, outcome)).toBe(GamePhase.ComeOut);
  });

  it('transitions to point on point number', () => {
    const state = createInitialState();
    const outcome = createDiceOutcome(2, 4); // 6
    expect(transitionPhase(state, outcome)).toBe(GamePhase.Point);
  });

  it('transitions to come-out on 7-out', () => {
    const state = { ...createInitialState(), phase: GamePhase.Point, point: 6 as const };
    const outcome = createDiceOutcome(3, 4); // 7
    expect(transitionPhase(state, outcome)).toBe(GamePhase.ComeOut);
  });

  it('transitions to come-out when point is made', () => {
    const state = { ...createInitialState(), phase: GamePhase.Point, point: 8 as const };
    const outcome = createDiceOutcome(4, 4); // 8
    expect(transitionPhase(state, outcome)).toBe(GamePhase.ComeOut);
  });

  it('stays in point phase on non-7/non-point', () => {
    const state = { ...createInitialState(), phase: GamePhase.Point, point: 6 as const };
    const outcome = createDiceOutcome(4, 5); // 9
    expect(transitionPhase(state, outcome)).toBe(GamePhase.Point);
  });
});

describe('getNewPoint', () => {
  it('returns point number on come-out', () => {
    const state = createInitialState();
    const outcome = createDiceOutcome(2, 4); // 6
    expect(getNewPoint(state, outcome)).toBe(6);
  });

  it('returns null on natural come-out', () => {
    const state = createInitialState();
    const outcome = createDiceOutcome(3, 4); // 7
    expect(getNewPoint(state, outcome)).toBeNull();
  });

  it('returns null on 7-out', () => {
    const state = { ...createInitialState(), phase: GamePhase.Point, point: 6 as const };
    const outcome = createDiceOutcome(3, 4); // 7
    expect(getNewPoint(state, outcome)).toBeNull();
  });

  it('returns null when point made', () => {
    const state = { ...createInitialState(), phase: GamePhase.Point, point: 8 as const };
    const outcome = createDiceOutcome(4, 4); // 8
    expect(getNewPoint(state, outcome)).toBeNull();
  });

  it('keeps existing point on other numbers', () => {
    const state = { ...createInitialState(), phase: GamePhase.Point, point: 6 as const };
    const outcome = createDiceOutcome(4, 5); // 9
    expect(getNewPoint(state, outcome)).toBe(6);
  });
});

describe('updateHardWayCounters', () => {
  it('resets counter when hard way hits', () => {
    const counters = { 4: 10, 6: 5, 8: 3, 10: 7 };
    const outcome = createDiceOutcome(3, 3); // hard 6
    const updated = updateHardWayCounters(counters, outcome);
    expect(updated[6]).toBe(0);
    expect(updated[4]).toBe(11);
    expect(updated[8]).toBe(4);
    expect(updated[10]).toBe(8);
  });

  it('increments all counters when no hard way', () => {
    const counters = { 4: 0, 6: 0, 8: 0, 10: 0 };
    const outcome = createDiceOutcome(3, 4); // 7 (no hard way)
    const updated = updateHardWayCounters(counters, outcome);
    expect(updated[4]).toBe(1);
    expect(updated[6]).toBe(1);
    expect(updated[8]).toBe(1);
    expect(updated[10]).toBe(1);
  });
});
