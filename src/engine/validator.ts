// ============================================================
// Bet Placement Validation
// ============================================================

import { BetType, GamePhase, type GameState, type PointNumber } from './types';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/** Validate whether a bet can be placed in the current game state */
export function validateBetPlacement(
  state: GameState,
  type: BetType,
  amount: number,
  pointNumber?: PointNumber
): ValidationResult {
  // Check sufficient credits
  if (amount > state.credits) {
    return { valid: false, reason: 'Insufficient credits' };
  }

  if (amount <= 0) {
    return { valid: false, reason: 'Bet amount must be positive' };
  }

  switch (type) {
    case BetType.PassLine:
      return validatePassLine(state);
    case BetType.DontPass:
      return validateDontPass(state);
    case BetType.PassLineOdds:
      return validatePassLineOdds(state);
    case BetType.DontPassOdds:
      return validateDontPassOdds(state);
    case BetType.Come:
      return validateCome(state);
    case BetType.DontCome:
      return validateDontCome(state);
    case BetType.Place:
    case BetType.Buy:
      return validatePlaceBuy(state, type, pointNumber);
    case BetType.Lay:
      return validateLay(state, pointNumber);
    case BetType.Big6:
    case BetType.Big8:
    case BetType.HardWay:
    case BetType.Field:
    case BetType.Craps:
    case BetType.Eleven:
    case BetType.CrapsEleven:
    case BetType.Seven:
    case BetType.AnyCraps:
    case BetType.Horn2:
    case BetType.Horn3:
    case BetType.Horn11:
    case BetType.Horn12:
    case BetType.HornBet:
    case BetType.Hop:
    case BetType.HoppingHardWay:
      return { valid: true }; // these can be placed anytime
    case BetType.LuckyShooter:
      return validateLuckyShooter(state);
    case BetType.LuckyRollerLow:
    case BetType.LuckyRollerHigh:
    case BetType.LuckyRollerAll:
      return validateLuckyRoller(state, type);
    default:
      return { valid: false, reason: 'Unknown bet type' };
  }
}

function validatePassLine(state: GameState): ValidationResult {
  if (state.phase !== GamePhase.ComeOut) {
    return { valid: false, reason: 'Pass Line can only be placed on the come-out roll' };
  }
  // Check for existing Don't Pass (excluding bet)
  if (state.bets.some((b) => b.type === BetType.DontPass)) {
    return { valid: false, reason: 'Cannot place Pass Line when Don\'t Pass is active' };
  }
  return { valid: true };
}

function validateDontPass(state: GameState): ValidationResult {
  if (state.phase !== GamePhase.ComeOut) {
    return { valid: false, reason: 'Don\'t Pass can only be placed on the come-out roll' };
  }
  if (state.bets.some((b) => b.type === BetType.PassLine)) {
    return { valid: false, reason: 'Cannot place Don\'t Pass when Pass Line is active' };
  }
  return { valid: true };
}

function validatePassLineOdds(state: GameState): ValidationResult {
  if (state.phase !== GamePhase.Point) {
    return { valid: false, reason: 'Pass Line Odds requires an established point' };
  }
  if (!state.bets.some((b) => b.type === BetType.PassLine)) {
    return { valid: false, reason: 'Pass Line Odds requires a Pass Line bet' };
  }
  return { valid: true };
}

function validateDontPassOdds(state: GameState): ValidationResult {
  if (state.phase !== GamePhase.Point) {
    return { valid: false, reason: 'Don\'t Pass Odds requires an established point' };
  }
  if (!state.bets.some((b) => b.type === BetType.DontPass)) {
    return { valid: false, reason: 'Don\'t Pass Odds requires a Don\'t Pass bet' };
  }
  return { valid: true };
}

function validateCome(state: GameState): ValidationResult {
  if (state.phase !== GamePhase.Point) {
    return { valid: false, reason: 'Come bet can only be placed after the point is established' };
  }
  if (state.bets.some((b) => b.type === BetType.DontCome && !state.dontComePoints.has(b.id))) {
    return { valid: false, reason: 'Cannot place Come when an unresolved Don\'t Come is active' };
  }
  return { valid: true };
}

function validateDontCome(state: GameState): ValidationResult {
  if (state.phase !== GamePhase.Point) {
    return { valid: false, reason: 'Don\'t Come can only be placed after the point is established' };
  }
  if (state.bets.some((b) => b.type === BetType.Come && !state.comePoints.has(b.id))) {
    return { valid: false, reason: 'Cannot place Don\'t Come when an unresolved Come is active' };
  }
  return { valid: true };
}

function validatePlaceBuy(state: GameState, type: BetType, pointNumber?: PointNumber): ValidationResult {
  if (!pointNumber) {
    return { valid: false, reason: `${type === BetType.Place ? 'Place' : 'Buy'} bet requires a point number` };
  }
  // Check for conflicting Lay bet on same number
  if (state.bets.some((b) => b.type === BetType.Lay && b.pointNumber === pointNumber)) {
    return { valid: false, reason: `Cannot place ${type === BetType.Place ? 'Place' : 'Buy'} bet when Lay is active on ${pointNumber}` };
  }
  return { valid: true };
}

function validateLay(state: GameState, pointNumber?: PointNumber): ValidationResult {
  if (!pointNumber) {
    return { valid: false, reason: 'Lay bet requires a point number' };
  }
  // Check for conflicting Place/Buy bets
  if (state.bets.some((b) => (b.type === BetType.Place || b.type === BetType.Buy) && b.pointNumber === pointNumber)) {
    return { valid: false, reason: `Cannot place Lay when Place/Buy is active on ${pointNumber}` };
  }
  return { valid: true };
}

function validateLuckyShooter(state: GameState): ValidationResult {
  // Lucky Shooter can only be placed during come-out (before point is established)
  if (state.phase !== GamePhase.ComeOut) {
    return { valid: false, reason: 'Lucky Shooter can only be placed before a point is established' };
  }
  // Only one Lucky Shooter bet at a time
  if (state.bets.some((b) => b.type === BetType.LuckyShooter)) {
    return { valid: false, reason: 'Lucky Shooter bet already active' };
  }
  return { valid: true };
}

function validateLuckyRoller(state: GameState, type: BetType): ValidationResult {
  // Lucky Roller can be placed anytime but only one of each type
  if (state.bets.some((b) => b.type === type)) {
    return { valid: false, reason: 'Lucky Roller bet of this type already active' };
  }
  return { valid: true };
}
