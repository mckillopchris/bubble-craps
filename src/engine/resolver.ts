// ============================================================
// Bet Resolution Engine
// Evaluates all active bets against a dice outcome
// ============================================================

import {
  ANY_CRAPS_PAYOUT,
  BIG_6_8_PAYOUT,
  BUY_PAYOUTS,
  C_BET_PAYOUT,
  CE_CRAPS_PAYOUT,
  CE_ELEVEN_PAYOUT,
  DONT_PASS_ODDS_PAYOUTS,
  DONT_PASS_PAYOUT,
  E_BET_PAYOUT,
  FIELD_PAYOUTS,
  FIELD_WINNERS,
  HARD_WAY_PAYOUTS,
  HOP_EASY_PAYOUT,
  HOP_HARD_PAYOUT,
  HORN_PAYOUTS,
  LAY_PAYOUTS,
  LUCKY_ROLLER_ALL_PAYOUT,
  LUCKY_ROLLER_ALL_TARGETS,
  LUCKY_ROLLER_HIGH_PAYOUT,
  LUCKY_ROLLER_HIGH_TARGETS,
  LUCKY_ROLLER_LOW_PAYOUT,
  LUCKY_ROLLER_LOW_TARGETS,
  LUCKY_SHOOTER_PAYOUTS,
  PASS_LINE_PAYOUT,
  PASS_ODDS_PAYOUTS,
  PLACE_PAYOUTS,
  SEVEN_PAYOUT,
  calculatePayout,
} from './bets';
import { isCraps, isNatural } from './state';
import {
  type Bet,
  BetResult,
  BetType,
  type BetResolution,
  type DiceOutcome,
  GamePhase,
  type GameState,
} from './types';

/** Resolve all bets against a dice outcome */
export function resolveAllBets(state: GameState, outcome: DiceOutcome): BetResolution[] {
  return state.bets.map((bet) => resolveBet(bet, state, outcome));
}

/** Resolve a single bet against a dice outcome */
export function resolveBet(bet: Bet, state: GameState, outcome: DiceOutcome): BetResolution {
  // Off bets are not resolved (except contract bets)
  if (!bet.isOn && !bet.isContract) {
    return { bet, result: BetResult.Active, payout: 0 };
  }

  switch (bet.type) {
    case BetType.PassLine:
      return resolvePassLine(bet, state, outcome);
    case BetType.DontPass:
      return resolveDontPass(bet, state, outcome);
    case BetType.PassLineOdds:
      return resolvePassLineOdds(bet, state, outcome);
    case BetType.DontPassOdds:
      return resolveDontPassOdds(bet, state, outcome);
    case BetType.Come:
      return resolveCome(bet, state, outcome);
    case BetType.DontCome:
      return resolveDontCome(bet, state, outcome);
    case BetType.ComeOdds:
      return resolveComeOdds(bet, state, outcome);
    case BetType.DontComeOdds:
      return resolveDontComeOdds(bet, state, outcome);
    case BetType.Place:
      return resolvePlace(bet, outcome);
    case BetType.Buy:
      return resolveBuy(bet, outcome);
    case BetType.Lay:
      return resolveLay(bet, outcome);
    case BetType.Big6:
      return resolveBig6(bet, outcome);
    case BetType.Big8:
      return resolveBig8(bet, outcome);
    case BetType.HardWay:
      return resolveHardWay(bet, outcome);
    case BetType.Field:
      return resolveField(bet, outcome);
    case BetType.Craps:
      return resolveCrapsBet(bet, outcome);
    case BetType.Eleven:
      return resolveElevenBet(bet, outcome);
    case BetType.CrapsEleven:
      return resolveCrapsElevenBet(bet, outcome);
    case BetType.Seven:
      return resolveSevenBet(bet, outcome);
    case BetType.AnyCraps:
      return resolveAnyCraps(bet, outcome);
    case BetType.Horn2:
    case BetType.Horn3:
    case BetType.Horn11:
    case BetType.Horn12:
      return resolveHornIndividual(bet, outcome);
    case BetType.HornBet:
      return resolveHornBet(bet, outcome);
    case BetType.Hop:
      return resolveHop(bet, outcome);
    case BetType.HoppingHardWay:
      return resolveHoppingHardWay(bet, outcome);
    case BetType.LuckyShooter:
      return resolveLuckyShooter(bet, state, outcome);
    case BetType.LuckyRollerLow:
      return resolveLuckyRoller(bet, state, outcome, LUCKY_ROLLER_LOW_TARGETS, LUCKY_ROLLER_LOW_PAYOUT);
    case BetType.LuckyRollerHigh:
      return resolveLuckyRoller(bet, state, outcome, LUCKY_ROLLER_HIGH_TARGETS, LUCKY_ROLLER_HIGH_PAYOUT);
    case BetType.LuckyRollerAll:
      return resolveLuckyRoller(bet, state, outcome, LUCKY_ROLLER_ALL_TARGETS, LUCKY_ROLLER_ALL_PAYOUT);
    default:
      return { bet, result: BetResult.Active, payout: 0 };
  }
}

// -- Pass Line --
function resolvePassLine(bet: Bet, state: GameState, outcome: DiceOutcome): BetResolution {
  if (state.phase === GamePhase.ComeOut) {
    if (isNatural(outcome.total)) {
      return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, PASS_LINE_PAYOUT) };
    }
    if (isCraps(outcome.total)) {
      return { bet, result: BetResult.Lose, payout: 0 };
    }
    // Point established - bet stays active
    return { bet, result: BetResult.Active, payout: 0 };
  }

  // Point phase
  if (outcome.total === state.point) {
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, PASS_LINE_PAYOUT) };
  }
  if (outcome.total === 7) {
    return { bet, result: BetResult.Lose, payout: 0 };
  }
  return { bet, result: BetResult.Active, payout: 0 };
}

// -- Don't Pass --
function resolveDontPass(bet: Bet, state: GameState, outcome: DiceOutcome): BetResolution {
  if (state.phase === GamePhase.ComeOut) {
    if (outcome.total === 2 || outcome.total === 3) {
      return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, DONT_PASS_PAYOUT) };
    }
    if (outcome.total === 12) {
      return { bet, result: BetResult.Push, payout: bet.amount }; // bar 12
    }
    if (outcome.total === 7 || outcome.total === 11) {
      return { bet, result: BetResult.Lose, payout: 0 };
    }
    return { bet, result: BetResult.Active, payout: 0 };
  }

  // Point phase
  if (outcome.total === 7) {
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, DONT_PASS_PAYOUT) };
  }
  if (outcome.total === state.point) {
    return { bet, result: BetResult.Lose, payout: 0 };
  }
  return { bet, result: BetResult.Active, payout: 0 };
}

// -- Pass Line Odds --
function resolvePassLineOdds(bet: Bet, state: GameState, outcome: DiceOutcome): BetResolution {
  if (!bet.isOn || state.phase !== GamePhase.Point || !state.point) {
    return { bet, result: BetResult.Active, payout: 0 };
  }
  if (outcome.total === state.point) {
    const odds = PASS_ODDS_PAYOUTS[state.point];
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, odds) };
  }
  if (outcome.total === 7) {
    return { bet, result: BetResult.Lose, payout: 0 };
  }
  return { bet, result: BetResult.Active, payout: 0 };
}

// -- Don't Pass Odds --
function resolveDontPassOdds(bet: Bet, state: GameState, outcome: DiceOutcome): BetResolution {
  if (!bet.isOn || state.phase !== GamePhase.Point || !state.point) {
    return { bet, result: BetResult.Active, payout: 0 };
  }
  if (outcome.total === 7) {
    const odds = DONT_PASS_ODDS_PAYOUTS[state.point];
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, odds) };
  }
  if (outcome.total === state.point) {
    return { bet, result: BetResult.Lose, payout: 0 };
  }
  return { bet, result: BetResult.Active, payout: 0 };
}

// -- Come --
function resolveCome(bet: Bet, state: GameState, outcome: DiceOutcome): BetResolution {
  const comePoint = state.comePoints.get(bet.id);

  if (comePoint === undefined) {
    // First roll for this Come bet - works like Pass Line come-out
    if (outcome.total === 7 || outcome.total === 11) {
      return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, PASS_LINE_PAYOUT) };
    }
    if (isCraps(outcome.total)) {
      return { bet, result: BetResult.Lose, payout: 0 };
    }
    // Point established for Come bet - stays active
    return { bet, result: BetResult.Active, payout: 0 };
  }

  // Come point already established
  if (outcome.total === comePoint) {
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, PASS_LINE_PAYOUT) };
  }
  if (outcome.total === 7) {
    return { bet, result: BetResult.Lose, payout: 0 };
  }
  return { bet, result: BetResult.Active, payout: 0 };
}

// -- Don't Come --
function resolveDontCome(bet: Bet, state: GameState, outcome: DiceOutcome): BetResolution {
  const dontComePoint = state.dontComePoints.get(bet.id);

  if (dontComePoint === undefined) {
    // First roll for this Don't Come bet
    if (outcome.total === 2 || outcome.total === 3) {
      return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, DONT_PASS_PAYOUT) };
    }
    if (outcome.total === 12) {
      return { bet, result: BetResult.Push, payout: bet.amount };
    }
    if (outcome.total === 7 || outcome.total === 11) {
      return { bet, result: BetResult.Lose, payout: 0 };
    }
    return { bet, result: BetResult.Active, payout: 0 };
  }

  // Don't Come point established
  if (outcome.total === 7) {
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, DONT_PASS_PAYOUT) };
  }
  if (outcome.total === dontComePoint) {
    return { bet, result: BetResult.Lose, payout: 0 };
  }
  return { bet, result: BetResult.Active, payout: 0 };
}

// -- Come Odds --
function resolveComeOdds(bet: Bet, _state: GameState, outcome: DiceOutcome): BetResolution {
  if (!bet.isOn || !bet.pointNumber) {
    return { bet, result: BetResult.Active, payout: 0 };
  }
  if (outcome.total === bet.pointNumber) {
    const odds = PASS_ODDS_PAYOUTS[bet.pointNumber];
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, odds) };
  }
  if (outcome.total === 7) {
    return { bet, result: BetResult.Lose, payout: 0 };
  }
  return { bet, result: BetResult.Active, payout: 0 };
}

// -- Don't Come Odds --
function resolveDontComeOdds(bet: Bet, _state: GameState, outcome: DiceOutcome): BetResolution {
  if (!bet.isOn || !bet.pointNumber) {
    return { bet, result: BetResult.Active, payout: 0 };
  }
  if (outcome.total === 7) {
    const odds = DONT_PASS_ODDS_PAYOUTS[bet.pointNumber];
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, odds) };
  }
  if (outcome.total === bet.pointNumber) {
    return { bet, result: BetResult.Lose, payout: 0 };
  }
  return { bet, result: BetResult.Active, payout: 0 };
}

// -- Place --
function resolvePlace(bet: Bet, outcome: DiceOutcome): BetResolution {
  if (!bet.isOn || !bet.pointNumber) {
    return { bet, result: BetResult.Active, payout: 0 };
  }
  if (outcome.total === bet.pointNumber) {
    const odds = PLACE_PAYOUTS[bet.pointNumber];
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, odds) };
  }
  if (outcome.total === 7) {
    return { bet, result: BetResult.Lose, payout: 0 };
  }
  return { bet, result: BetResult.Active, payout: 0 };
}

// -- Buy --
function resolveBuy(bet: Bet, outcome: DiceOutcome): BetResolution {
  if (!bet.isOn || !bet.pointNumber) {
    return { bet, result: BetResult.Active, payout: 0 };
  }
  if (outcome.total === bet.pointNumber) {
    const odds = BUY_PAYOUTS[bet.pointNumber];
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, odds) };
  }
  if (outcome.total === 7) {
    return { bet, result: BetResult.Lose, payout: 0 };
  }
  return { bet, result: BetResult.Active, payout: 0 };
}

// -- Lay --
function resolveLay(bet: Bet, outcome: DiceOutcome): BetResolution {
  if (!bet.isOn || !bet.pointNumber) {
    return { bet, result: BetResult.Active, payout: 0 };
  }
  if (outcome.total === 7) {
    const odds = LAY_PAYOUTS[bet.pointNumber];
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, odds) };
  }
  if (outcome.total === bet.pointNumber) {
    return { bet, result: BetResult.Lose, payout: 0 };
  }
  return { bet, result: BetResult.Active, payout: 0 };
}

// -- Big 6 --
function resolveBig6(bet: Bet, outcome: DiceOutcome): BetResolution {
  if (outcome.total === 6) {
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, BIG_6_8_PAYOUT) };
  }
  if (outcome.total === 7) {
    return { bet, result: BetResult.Lose, payout: 0 };
  }
  return { bet, result: BetResult.Active, payout: 0 };
}

// -- Big 8 --
function resolveBig8(bet: Bet, outcome: DiceOutcome): BetResolution {
  if (outcome.total === 8) {
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, BIG_6_8_PAYOUT) };
  }
  if (outcome.total === 7) {
    return { bet, result: BetResult.Lose, payout: 0 };
  }
  return { bet, result: BetResult.Active, payout: 0 };
}

// -- Hard Ways --
function resolveHardWay(bet: Bet, outcome: DiceOutcome): BetResolution {
  if (!bet.isOn || !bet.hardWayTotal) {
    return { bet, result: BetResult.Active, payout: 0 };
  }
  // Win: hard way rolled (e.g., 2-2 for hard 4)
  if (outcome.total === bet.hardWayTotal && outcome.isHardWay) {
    const odds = HARD_WAY_PAYOUTS[bet.hardWayTotal];
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, odds) };
  }
  // Lose: easy way rolled (same total but not hard) or 7
  if (outcome.total === bet.hardWayTotal || outcome.total === 7) {
    return { bet, result: BetResult.Lose, payout: 0 };
  }
  return { bet, result: BetResult.Active, payout: 0 };
}

// -- Field --
function resolveField(bet: Bet, outcome: DiceOutcome): BetResolution {
  if (FIELD_WINNERS.includes(outcome.total)) {
    const payoutEntry = FIELD_PAYOUTS[outcome.total];
    if (payoutEntry) {
      return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, payoutEntry) };
    }
  }
  return { bet, result: BetResult.Lose, payout: 0 };
}

// -- C (Craps) --
function resolveCrapsBet(bet: Bet, outcome: DiceOutcome): BetResolution {
  if (isCraps(outcome.total)) {
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, C_BET_PAYOUT) };
  }
  return { bet, result: BetResult.Lose, payout: 0 };
}

// -- E (Eleven) --
function resolveElevenBet(bet: Bet, outcome: DiceOutcome): BetResolution {
  if (outcome.total === 11) {
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, E_BET_PAYOUT) };
  }
  return { bet, result: BetResult.Lose, payout: 0 };
}

// -- C&E --
function resolveCrapsElevenBet(bet: Bet, outcome: DiceOutcome): BetResolution {
  if (isCraps(outcome.total)) {
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, CE_CRAPS_PAYOUT) };
  }
  if (outcome.total === 11) {
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, CE_ELEVEN_PAYOUT) };
  }
  return { bet, result: BetResult.Lose, payout: 0 };
}

// -- Seven --
function resolveSevenBet(bet: Bet, outcome: DiceOutcome): BetResolution {
  if (outcome.total === 7) {
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, SEVEN_PAYOUT) };
  }
  return { bet, result: BetResult.Lose, payout: 0 };
}

// -- Any Craps --
function resolveAnyCraps(bet: Bet, outcome: DiceOutcome): BetResolution {
  if (isCraps(outcome.total)) {
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, ANY_CRAPS_PAYOUT) };
  }
  return { bet, result: BetResult.Lose, payout: 0 };
}

// -- Individual Horn bets --
function resolveHornIndividual(bet: Bet, outcome: DiceOutcome): BetResolution {
  const targetTotal = getHornTarget(bet.type);
  if (outcome.total === targetTotal) {
    const odds = HORN_PAYOUTS[targetTotal as 2 | 3 | 11 | 12];
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, odds) };
  }
  return { bet, result: BetResult.Lose, payout: 0 };
}

function getHornTarget(type: BetType): number {
  switch (type) {
    case BetType.Horn2: return 2;
    case BetType.Horn3: return 3;
    case BetType.Horn11: return 11;
    case BetType.Horn12: return 12;
    default: return -1;
  }
}

// -- Combined Horn bet (split 4 ways) --
function resolveHornBet(bet: Bet, outcome: DiceOutcome): BetResolution {
  const quarterBet = bet.amount / 4;
  const hornTotals: (2 | 3 | 11 | 12)[] = [2, 3, 11, 12];

  if (hornTotals.includes(outcome.total as 2 | 3 | 11 | 12)) {
    const winningTotal = outcome.total as 2 | 3 | 11 | 12;
    const odds = HORN_PAYOUTS[winningTotal];
    // Win on one quarter, lose three quarters
    const winAmount = quarterBet + calculatePayout(quarterBet, odds);
    const lostAmount = quarterBet * 3;
    const netPayout = winAmount - lostAmount;
    return { bet, result: BetResult.Win, payout: Math.max(0, netPayout) };
  }
  return { bet, result: BetResult.Lose, payout: 0 };
}

// -- Hop bets --
function resolveHop(bet: Bet, outcome: DiceOutcome): BetResolution {
  if (!bet.diceCombination) {
    return { bet, result: BetResult.Lose, payout: 0 };
  }
  const { die1, die2 } = bet.diceCombination;
  if (
    (outcome.die1 === die1 && outcome.die2 === die2) ||
    (outcome.die1 === die2 && outcome.die2 === die1)
  ) {
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, HOP_EASY_PAYOUT) };
  }
  return { bet, result: BetResult.Lose, payout: 0 };
}

// -- Hopping Hard Ways --
function resolveHoppingHardWay(bet: Bet, outcome: DiceOutcome): BetResolution {
  if (!bet.diceCombination) {
    return { bet, result: BetResult.Lose, payout: 0 };
  }
  const { die1, die2 } = bet.diceCombination;
  if (outcome.die1 === die1 && outcome.die2 === die2 && die1 === die2) {
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, HOP_HARD_PAYOUT) };
  }
  return { bet, result: BetResult.Lose, payout: 0 };
}

// -- Lucky Shooter --
// Resolves on 7-out. Pays based on unique point numbers hit during shooter's turn.
// The hits are tracked in GameState.luckyShooterHits and include the CURRENT roll.
function resolveLuckyShooter(bet: Bet, state: GameState, outcome: DiceOutcome): BetResolution {
  // Lucky Shooter only resolves on 7-out (7 during point phase)
  if (state.phase !== GamePhase.Point || outcome.total !== 7) {
    return { bet, result: BetResult.Active, payout: 0 };
  }

  // Count unique point hits (already tracked in state, current roll won't add a 7)
  const hits = state.luckyShooterHits.length;

  if (hits >= 2 && LUCKY_SHOOTER_PAYOUTS[hits]) {
    const odds = LUCKY_SHOOTER_PAYOUTS[hits];
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, odds) };
  }

  // 0-1 hits: lose
  return { bet, result: BetResult.Lose, payout: 0 };
}

// -- Lucky Roller (Low, High, All) --
// Wins when all target numbers are hit. Loses on 7.
// Tracking is done in GameState.luckyRollerHits, which includes the current roll.
import type { PayoutOdds } from './types';
function resolveLuckyRoller(
  bet: Bet,
  state: GameState,
  outcome: DiceOutcome,
  targets: number[],
  winPayout: PayoutOdds
): BetResolution {
  // Check if current roll completes all targets
  const currentHits = new Set(state.luckyRollerHits);
  if (outcome.total !== 7) {
    currentHits.add(outcome.total);
  }

  const allHit = targets.every((t) => currentHits.has(t as DiceOutcome['total']));

  if (allHit) {
    return { bet, result: BetResult.Win, payout: bet.amount + calculatePayout(bet.amount, winPayout) };
  }

  // Lose on 7
  if (outcome.total === 7) {
    return { bet, result: BetResult.Lose, payout: 0 };
  }

  return { bet, result: BetResult.Active, payout: 0 };
}
