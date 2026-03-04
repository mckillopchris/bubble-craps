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

const INSIDE_NUMBERS: PointNumber[] = [5, 6, 8, 9];
const OUTSIDE_NUMBERS: PointNumber[] = [4, 5, 9, 10];
const ALL_POINT_NUMBERS: PointNumber[] = [4, 5, 6, 8, 9, 10];

interface GameStore extends GameState {
  // UI state
  selectedChipValue: number;
  isRolling: boolean;
  lastResolutions: BetResolution[];
  bettingTimer: number | null; // seconds remaining, null = no timer

  // Settings
  showWinnings: boolean;
  showHints: boolean;
  showBetLimits: boolean;
  soundEnabled: boolean;

  // Actions
  setShowWinnings: (show: boolean) => void;
  setShowHints: (show: boolean) => void;
  setShowBetLimits: (show: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSelectedChip: (value: number) => void;
  placeBet: (type: BetType, amount?: number, pointNumber?: PointNumber, hardWayTotal?: 4 | 6 | 8 | 10, diceCombination?: DiceCombination) => boolean;
  removeBet: (betId: string) => void;
  clearLastBet: () => void;
  clearAllBets: () => void;
  doubleBets: () => void;
  repeatLastBet: () => void;
  pressLastPoint: () => void;
  placeBetsAcross: () => void;
  placeBetsInside: () => void;
  placeBetsOutside: () => void;
  toggleBetsOnOff: () => void;
  startRoll: () => void;
  completeRoll: (outcome: DiceOutcome) => void;
  resetGame: () => void;
  setBettingTimer: (seconds: number | null) => void;
  tickBettingTimer: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial game state
  ...createInitialState(1000),
  selectedChipValue: 5,
  isRolling: false,
  lastResolutions: [],
  bettingTimer: null,

  // Settings defaults
  showWinnings: false,
  showHints: true,
  showBetLimits: false,
  soundEnabled: true,

  setShowWinnings: (show) => set({ showWinnings: show }),
  setShowHints: (show) => set({ showHints: show }),
  setShowBetLimits: (show) => set({ showBetLimits: show }),
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

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

    // Bet types that always create separate entries (each has its own lifecycle)
    const ALWAYS_NEW_BET = new Set([BetType.Come, BetType.DontCome]);

    // Try to stack onto an existing bet of the same type/number
    const existingBet = !ALWAYS_NEW_BET.has(type)
      ? state.bets.find(
          (b) =>
            b.type === type &&
            b.pointNumber === pointNumber &&
            b.hardWayTotal === hardWayTotal &&
            b.diceCombination === diceCombination
        )
      : undefined;

    if (existingBet) {
      set((s) => ({
        bets: s.bets.map((b) =>
          b.id === existingBet.id
            ? { ...b, amount: b.amount + betAmount, commissionPaid: b.commissionPaid + commissionPaid }
            : b
        ),
        credits: s.credits - totalDeduction,
      }));
    } else {
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
    }

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

  pressLastPoint: () => {
    const state = get();
    if (state.isRolling || !state.point) return;

    // Find existing Place bet on the current point and double it
    const placeBet = state.bets.find(
      (b) => b.type === BetType.Place && b.pointNumber === state.point
    );

    if (!placeBet) {
      // No Place bet on point - place one at selected chip value
      get().placeBet(BetType.Place, state.selectedChipValue, state.point);
      return;
    }

    // Double the existing Place bet
    if (placeBet.amount > state.credits) {
      console.warn('Insufficient credits to press');
      return;
    }

    set((s) => ({
      bets: s.bets.map((b) =>
        b.id === placeBet.id ? { ...b, amount: b.amount * 2 } : b
      ),
      credits: s.credits - placeBet.amount,
    }));
  },

  placeBetsAcross: () => {
    const state = get();
    if (state.isRolling) return;
    const numbers = ALL_POINT_NUMBERS.filter((n) => n !== state.point);
    for (const num of numbers) {
      // Skip if already have a Place bet on this number
      if (state.bets.some((b) => b.type === BetType.Place && b.pointNumber === num)) continue;
      get().placeBet(BetType.Place, state.selectedChipValue, num);
    }
  },

  placeBetsInside: () => {
    const state = get();
    if (state.isRolling) return;
    const numbers = INSIDE_NUMBERS.filter((n) => n !== state.point);
    for (const num of numbers) {
      if (state.bets.some((b) => b.type === BetType.Place && b.pointNumber === num)) continue;
      get().placeBet(BetType.Place, state.selectedChipValue, num);
    }
  },

  placeBetsOutside: () => {
    const state = get();
    if (state.isRolling) return;
    const numbers = OUTSIDE_NUMBERS.filter((n) => n !== state.point);
    for (const num of numbers) {
      if (state.bets.some((b) => b.type === BetType.Place && b.pointNumber === num)) continue;
      get().placeBet(BetType.Place, state.selectedChipValue, num);
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
      if (resolution.result === BetResult.WinStay) {
        // Bet pays out but stays on the table (e.g. Place bets)
        totalPayout += resolution.payout;
      } else if (resolution.result !== BetResult.Active) {
        resolvedBetIds.add(resolution.bet.id);
        totalPayout += resolution.payout;
      }
    }

    // Remove resolved bets, keep active ones (WinStay bets are NOT removed)
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

    // Update Lucky Shooter hits: track unique point numbers hit during shooter's turn
    let newLuckyShooterHits = [...state.luckyShooterHits];
    if (isPointNumber(outcome.total) && !newLuckyShooterHits.includes(outcome.total)) {
      newLuckyShooterHits.push(outcome.total);
    }
    // Reset on 7-out (7 during point phase = new shooter)
    if (state.phase === GamePhase.Point && outcome.total === 7) {
      newLuckyShooterHits = [];
    }

    // Update Lucky Roller hits: track all totals hit since last 7
    let newLuckyRollerHits = [...state.luckyRollerHits];
    if (outcome.total === 7) {
      // 7 resets Lucky Roller tracking
      newLuckyRollerHits = [];
    } else {
      if (!newLuckyRollerHits.includes(outcome.total)) {
        newLuckyRollerHits.push(outcome.total);
      }
    }

    // Save bet config for repeat (exclude side bets)
    const SIDE_BET_TYPES = new Set([BetType.LuckyShooter, BetType.LuckyRollerLow, BetType.LuckyRollerHigh, BetType.LuckyRollerAll]);
    const lastBetConfig = state.bets
      .filter((b) => !SIDE_BET_TYPES.has(b.type) && (!isSingleRollBet(b.type) || resolvedBetIds.has(b.id)))
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
      luckyShooterHits: newLuckyShooterHits,
      luckyRollerHits: newLuckyRollerHits,
    });
  },

  resetGame: () => {
    set({
      ...createInitialState(1000),
      selectedChipValue: 5,
      isRolling: false,
      lastResolutions: [],
      bettingTimer: null,
    });
  },

  setBettingTimer: (seconds) => set({ bettingTimer: seconds }),

  tickBettingTimer: () => {
    set((s) => {
      if (s.bettingTimer === null || s.bettingTimer <= 0) return { bettingTimer: null };
      return { bettingTimer: s.bettingTimer - 1 };
    });
  },
}));
