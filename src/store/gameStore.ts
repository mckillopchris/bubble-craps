// ============================================================
// Zustand Game Store
// Central state management connecting engine, dice, and UI
// ============================================================

import { create } from 'zustand';
import {
  type Bet,
  BetResult,
  BetType,
  type BetResolution,
  type DiceOutcome,
  type DiceCombination,
  GamePhase,
  type GameState,
  type PointNumber,
} from '../engine/types';
import {
  createInitialState,
  generateBetId,
  getNewPoint,
  isPointNumber,
  transitionPhase,
  updateHardWayCounters,
} from '../engine/state';
import { resolveAllBets } from '../engine/resolver';
import { validateBetPlacement } from '../engine/validator';
import { calculateCommission, isContractBet, isSingleRollBet, TOGGLABLE_BETS } from '../engine/bets';

interface GameStore extends GameState {
  // UI state
  selectedChipValue: number;
  isRolling: boolean;
  lastResolutions: BetResolution[];

  // Actions
  setSelectedChip: (value: number) => void;
  placeBet: (type: BetType, amount?: number, pointNumber?: PointNumber, hardWayTotal?: 4 | 6 | 8 | 10, diceCombination?: DiceCombination) => boolean;
  removeBet: (betId: string) => void;
  clearLastBet: () => void;
  clearAllBets: () => void;
  doubleBets: () => void;
  repeatLastBet: () => void;
  toggleBetsOnOff: () => void;
  startRoll: () => void;
  completeRoll: (outcome: DiceOutcome) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial game state
  ...createInitialState(1000),
  selectedChipValue: 5,
  isRolling: false,
  lastResolutions: [],

  setSelectedChip: (value) => set({ selectedChipValue: value }),

  placeBet: (type, amount, pointNumber, hardWayTotal, diceCombination) => {
    const state = get();
    const betAmount = amount ?? state.selectedChipValue;

    const validation = validateBetPlacement(state, type, betAmount, pointNumber);
    if (!validation.valid) {
      console.warn('Invalid bet:', validation.reason);
      return false;
    }

    // Calculate commission for Buy/Lay bets
    let commissionPaid = 0;
    let totalDeduction = betAmount;
    if (type === BetType.Buy || type === BetType.Lay) {
      commissionPaid = calculateCommission(betAmount);
      totalDeduction = betAmount + commissionPaid;
    }

    if (totalDeduction > state.credits) {
      console.warn('Insufficient credits for bet + commission');
      return false;
    }

    const bet: Bet = {
      id: generateBetId(),
      type,
      amount: betAmount,
      pointNumber,
      hardWayTotal,
      diceCombination,
      isOn: true,
      isContract: isContractBet(type),
      commissionPaid,
      parentBetId: undefined,
    };

    set((s) => ({
      bets: [...s.bets, bet],
      credits: s.credits - totalDeduction,
    }));

    return true;
  },

  removeBet: (betId) => {
    const state = get();
    const bet = state.bets.find((b) => b.id === betId);
    if (!bet) return;

    // Cannot remove contract bets once point is established
    if (bet.isContract && state.phase === GamePhase.Point) {
      console.warn('Cannot remove contract bet during point phase');
      return;
    }

    set((s) => ({
      bets: s.bets.filter((b) => b.id !== betId),
      credits: s.credits + bet.amount + bet.commissionPaid,
    }));
  },

  clearLastBet: () => {
    const state = get();
    // Find last removable bet
    for (let i = state.bets.length - 1; i >= 0; i--) {
      const bet = state.bets[i]!;
      if (!bet.isContract || state.phase === GamePhase.ComeOut) {
        set((s) => ({
          bets: s.bets.filter((b) => b.id !== bet.id),
          credits: s.credits + bet.amount + bet.commissionPaid,
        }));
        return;
      }
    }
  },

  clearAllBets: () => {
    const state = get();
    let refund = 0;
    const remainingBets: Bet[] = [];

    for (const bet of state.bets) {
      if (bet.isContract && state.phase === GamePhase.Point) {
        remainingBets.push(bet);
      } else {
        refund += bet.amount + bet.commissionPaid;
      }
    }

    set({ bets: remainingBets, credits: state.credits + refund });
  },

  doubleBets: () => {
    const state = get();
    let totalAdditional = 0;
    const doubledBets = state.bets.map((bet) => {
      if (bet.isContract && state.phase === GamePhase.Point) {
        return bet; // can't double contract bets during point phase
      }
      totalAdditional += bet.amount;
      return { ...bet, amount: bet.amount * 2 };
    });

    if (totalAdditional > state.credits) {
      console.warn('Insufficient credits to double bets');
      return;
    }

    set({ bets: doubledBets, credits: state.credits - totalAdditional });
  },

  repeatLastBet: () => {
    const state = get();
    if (state.lastBetConfig.length === 0) return;
    if (state.isRolling) return;

    // Calculate total cost
    let totalCost = 0;
    for (const config of state.lastBetConfig) {
      totalCost += config.amount;
      if (config.type === BetType.Buy || config.type === BetType.Lay) {
        totalCost += calculateCommission(config.amount);
      }
    }

    if (totalCost > state.credits) {
      console.warn('Insufficient credits to repeat last bet');
      return;
    }

    // Place each bet from the saved config
    for (const config of state.lastBetConfig) {
      get().placeBet(config.type, config.amount, config.pointNumber, config.hardWayTotal, config.diceCombination);
    }
  },

  toggleBetsOnOff: () => {
    set((s) => {
      const newBetsOn = !s.betsOn;
      const updatedBets = s.bets.map((bet) => {
        if (TOGGLABLE_BETS.has(bet.type)) {
          return { ...bet, isOn: newBetsOn };
        }
        return bet;
      });
      return { betsOn: newBetsOn, bets: updatedBets };
    });
  },

  startRoll: () => {
    const state = get();
    if (state.isRolling) return;
    if (state.bets.length === 0) {
      console.warn('No bets placed');
      return;
    }
    set({ isRolling: true });
  },

  completeRoll: (outcome) => {
    const state = get();

    // Resolve all bets
    const resolutions = resolveAllBets(state, outcome);

    // Calculate payouts
    let totalPayout = 0;
    const resolvedBetIds = new Set<string>();

    for (const resolution of resolutions) {
      if (resolution.result !== BetResult.Active) {
        resolvedBetIds.add(resolution.bet.id);
        totalPayout += resolution.payout;
      }
    }

    // Remove resolved bets, keep active ones
    const remainingBets = state.bets.filter((b) => !resolvedBetIds.has(b.id));

    // Handle Come/Don't Come point establishment
    const newComePoints = new Map(state.comePoints);
    const newDontComePoints = new Map(state.dontComePoints);

    if (isPointNumber(outcome.total)) {
      for (const bet of remainingBets) {
        if (bet.type === BetType.Come && !newComePoints.has(bet.id)) {
          newComePoints.set(bet.id, outcome.total);
          // Mark as contract once point established
          bet.isContract = true;
        }
        if (bet.type === BetType.DontCome && !newDontComePoints.has(bet.id)) {
          newDontComePoints.set(bet.id, outcome.total);
        }
      }
    }

    // Clean up come points for resolved bets
    for (const betId of resolvedBetIds) {
      newComePoints.delete(betId);
      newDontComePoints.delete(betId);
    }

    // Transition game phase
    const newPhase = transitionPhase(state, outcome);
    const newPoint = getNewPoint(state, outcome);

    // Update hard way counters
    const newHardWayCounters = updateHardWayCounters(state.rollsSinceHardWay, outcome);

    // Save bet config for repeat
    const lastBetConfig = state.bets
      .filter((b) => !isSingleRollBet(b.type) || resolvedBetIds.has(b.id))
      .map((b) => ({
        type: b.type,
        amount: b.amount,
        pointNumber: b.pointNumber,
        hardWayTotal: b.hardWayTotal,
        diceCombination: b.diceCombination,
      }));

    set({
      phase: newPhase,
      point: newPoint,
      bets: remainingBets,
      credits: state.credits + totalPayout,
      rollHistory: [outcome, ...state.rollHistory].slice(0, 50),
      comePoints: newComePoints,
      dontComePoints: newDontComePoints,
      rollsSinceHardWay: newHardWayCounters,
      isRolling: false,
      lastWin: totalPayout,
      lastResolutions: resolutions,
      lastBetConfig: lastBetConfig.length > 0 ? lastBetConfig : state.lastBetConfig,
    });
  },

  resetGame: () => {
    set({
      ...createInitialState(1000),
      selectedChipValue: 5,
      isRolling: false,
      lastResolutions: [],
    });
  },
}));
