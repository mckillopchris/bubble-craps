import { describe, it, expect, beforeEach } from 'vitest';
import { validateBetPlacement } from '../validator';
import { createInitialState, resetBetIdCounter } from '../state';
import { BetType, GamePhase, type Bet, type GameState } from '../types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(), ...overrides };
}

function makeBet(overrides: Partial<Bet>): Bet {
  return {
    id: 'test',
    type: BetType.PassLine,
    amount: 10,
    isOn: true,
    isContract: false,
    commissionPaid: 0,
    ...overrides,
  };
}

beforeEach(() => {
  resetBetIdCounter();
});

describe('validateBetPlacement', () => {
  it('rejects negative amounts', () => {
    const state = makeState();
    const result = validateBetPlacement(state, BetType.PassLine, -5);
    expect(result.valid).toBe(false);
  });

  it('rejects amounts exceeding credits', () => {
    const state = makeState({ credits: 10 });
    const result = validateBetPlacement(state, BetType.PassLine, 20);
    expect(result.valid).toBe(false);
  });

  describe('Pass Line', () => {
    it('allows on come-out', () => {
      const state = makeState();
      const result = validateBetPlacement(state, BetType.PassLine, 10);
      expect(result.valid).toBe(true);
    });

    it('rejects during point phase', () => {
      const state = makeState({ phase: GamePhase.Point, point: 6 });
      const result = validateBetPlacement(state, BetType.PassLine, 10);
      expect(result.valid).toBe(false);
    });

    it('rejects when Don\'t Pass is active', () => {
      const state = makeState({
        bets: [makeBet({ type: BetType.DontPass })],
      });
      const result = validateBetPlacement(state, BetType.PassLine, 10);
      expect(result.valid).toBe(false);
    });
  });

  describe("Don't Pass", () => {
    it('allows on come-out', () => {
      const state = makeState();
      const result = validateBetPlacement(state, BetType.DontPass, 10);
      expect(result.valid).toBe(true);
    });

    it('rejects when Pass Line is active', () => {
      const state = makeState({
        bets: [makeBet({ type: BetType.PassLine })],
      });
      const result = validateBetPlacement(state, BetType.DontPass, 10);
      expect(result.valid).toBe(false);
    });
  });

  describe('Come', () => {
    it('allows during point phase', () => {
      const state = makeState({ phase: GamePhase.Point, point: 6 });
      const result = validateBetPlacement(state, BetType.Come, 10);
      expect(result.valid).toBe(true);
    });

    it('rejects during come-out', () => {
      const state = makeState();
      const result = validateBetPlacement(state, BetType.Come, 10);
      expect(result.valid).toBe(false);
    });
  });

  describe('Pass Line Odds', () => {
    it('requires point phase and Pass Line bet', () => {
      const state = makeState({
        phase: GamePhase.Point,
        point: 6,
        bets: [makeBet({ type: BetType.PassLine })],
      });
      const result = validateBetPlacement(state, BetType.PassLineOdds, 10);
      expect(result.valid).toBe(true);
    });

    it('rejects without Pass Line bet', () => {
      const state = makeState({ phase: GamePhase.Point, point: 6 });
      const result = validateBetPlacement(state, BetType.PassLineOdds, 10);
      expect(result.valid).toBe(false);
    });
  });

  describe('Place/Buy', () => {
    it('requires point number', () => {
      const state = makeState();
      const result = validateBetPlacement(state, BetType.Place, 10);
      expect(result.valid).toBe(false);
    });

    it('allows with point number', () => {
      const state = makeState();
      const result = validateBetPlacement(state, BetType.Place, 10, 6);
      expect(result.valid).toBe(true);
    });

    it('rejects when Lay is active on same number', () => {
      const state = makeState({
        bets: [makeBet({ type: BetType.Lay, pointNumber: 6 })],
      });
      const result = validateBetPlacement(state, BetType.Place, 10, 6);
      expect(result.valid).toBe(false);
    });
  });

  describe('Lay', () => {
    it('rejects when Place is active on same number', () => {
      const state = makeState({
        bets: [makeBet({ type: BetType.Place, pointNumber: 8 })],
      });
      const result = validateBetPlacement(state, BetType.Lay, 10, 8);
      expect(result.valid).toBe(false);
    });
  });

  describe('Single-roll bets', () => {
    it('allows Field bet anytime', () => {
      const state = makeState();
      expect(validateBetPlacement(state, BetType.Field, 10).valid).toBe(true);
    });

    it('allows Seven bet anytime', () => {
      const state = makeState({ phase: GamePhase.Point, point: 6 });
      expect(validateBetPlacement(state, BetType.Seven, 10).valid).toBe(true);
    });

    it('allows Horn bet anytime', () => {
      const state = makeState();
      expect(validateBetPlacement(state, BetType.HornBet, 10).valid).toBe(true);
    });
  });
});
