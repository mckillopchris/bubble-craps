// ============================================================
// Bet Definitions, Payout Tables, and Win/Loss Conditions
// ============================================================

import {
  BetType,
  type DiceTotal,
  type PayoutOdds,
  type PointNumber,
} from './types';

// -- Payout tables --

/** Pass Line / Come: even money (1:1) */
export const PASS_LINE_PAYOUT: PayoutOdds = { pays: 1, per: 1 };

/** Don't Pass / Don't Come: even money (1:1) */
export const DONT_PASS_PAYOUT: PayoutOdds = { pays: 1, per: 1 };

/** True odds payouts for Pass Line / Come odds bets by point */
export const PASS_ODDS_PAYOUTS: Record<PointNumber, PayoutOdds> = {
  4: { pays: 2, per: 1 },
  5: { pays: 3, per: 2 },
  6: { pays: 6, per: 5 },
  8: { pays: 6, per: 5 },
  9: { pays: 3, per: 2 },
  10: { pays: 2, per: 1 },
};

/** True odds payouts for Don't Pass / Don't Come odds bets by point */
export const DONT_PASS_ODDS_PAYOUTS: Record<PointNumber, PayoutOdds> = {
  4: { pays: 1, per: 2 },
  5: { pays: 2, per: 3 },
  6: { pays: 5, per: 6 },
  8: { pays: 5, per: 6 },
  9: { pays: 2, per: 3 },
  10: { pays: 1, per: 2 },
};

/** Place bet payouts by point */
export const PLACE_PAYOUTS: Record<PointNumber, PayoutOdds> = {
  4: { pays: 9, per: 5 },
  5: { pays: 7, per: 5 },
  6: { pays: 7, per: 6 },
  8: { pays: 7, per: 6 },
  9: { pays: 7, per: 5 },
  10: { pays: 9, per: 5 },
};

/** Buy bet payouts (true odds, commission paid separately) */
export const BUY_PAYOUTS: Record<PointNumber, PayoutOdds> = {
  4: { pays: 2, per: 1 },
  5: { pays: 3, per: 2 },
  6: { pays: 6, per: 5 },
  8: { pays: 6, per: 5 },
  9: { pays: 3, per: 2 },
  10: { pays: 2, per: 1 },
};

/** Lay bet payouts (true odds, commission paid separately) */
export const LAY_PAYOUTS: Record<PointNumber, PayoutOdds> = {
  4: { pays: 1, per: 2 },
  5: { pays: 2, per: 3 },
  6: { pays: 5, per: 6 },
  8: { pays: 5, per: 6 },
  9: { pays: 2, per: 3 },
  10: { pays: 1, per: 2 },
};

/** Commission rate for Buy/Lay bets (5%) */
export const COMMISSION_RATE = 0.05;

/** Hard Way payouts */
export const HARD_WAY_PAYOUTS: Record<4 | 6 | 8 | 10, PayoutOdds> = {
  4: { pays: 7, per: 1 },
  6: { pays: 9, per: 1 },
  8: { pays: 9, per: 1 },
  10: { pays: 7, per: 1 },
};

/** Big 6 / Big 8: even money */
export const BIG_6_8_PAYOUT: PayoutOdds = { pays: 1, per: 1 };

/** Field bet payouts by total */
export const FIELD_PAYOUTS: Record<number, PayoutOdds> = {
  2: { pays: 2, per: 1 }, // double payout
  3: { pays: 1, per: 1 },
  4: { pays: 1, per: 1 },
  9: { pays: 1, per: 1 },
  10: { pays: 1, per: 1 },
  11: { pays: 1, per: 1 },
  12: { pays: 2, per: 1 }, // double payout (or triple with EL602)
};

/** Field winning totals */
export const FIELD_WINNERS: DiceTotal[] = [2, 3, 4, 9, 10, 11, 12];

/** Seven bet: 4 to 1 */
export const SEVEN_PAYOUT: PayoutOdds = { pays: 4, per: 1 };

/** Any Craps bet: 7 to 1 */
export const ANY_CRAPS_PAYOUT: PayoutOdds = { pays: 7, per: 1 };

/** C (Craps) bet: 7 to 1 */
export const C_BET_PAYOUT: PayoutOdds = { pays: 7, per: 1 };

/** E (Eleven) bet: 15 to 1 */
export const E_BET_PAYOUT: PayoutOdds = { pays: 15, per: 1 };

/** C&E bet payouts depend on what hits */
export const CE_CRAPS_PAYOUT: PayoutOdds = { pays: 3, per: 1 }; // if craps hits
export const CE_ELEVEN_PAYOUT: PayoutOdds = { pays: 7, per: 1 }; // if 11 hits

/** Horn bet individual payouts */
export const HORN_PAYOUTS: Record<2 | 3 | 11 | 12, PayoutOdds> = {
  2: { pays: 30, per: 1 },
  3: { pays: 15, per: 1 },
  11: { pays: 15, per: 1 },
  12: { pays: 30, per: 1 },
};

/** Hop bet payouts */
export const HOP_EASY_PAYOUT: PayoutOdds = { pays: 15, per: 1 }; // easy way hops
export const HOP_HARD_PAYOUT: PayoutOdds = { pays: 30, per: 1 }; // hopping hard ways

/** Calculate payout amount for a given bet amount and odds */
export function calculatePayout(amount: number, odds: PayoutOdds): number {
  return (amount * odds.pays) / odds.per;
}

/** Calculate commission for Buy/Lay bets */
export function calculateCommission(amount: number): number {
  return Math.ceil(amount * COMMISSION_RATE);
}

/** Check if a bet type is single-roll */
export function isSingleRollBet(type: BetType): boolean {
  return SINGLE_ROLL_BETS.has(type);
}

/** Check if a bet type is a contract bet */
export function isContractBet(type: BetType): boolean {
  return type === BetType.PassLine || type === BetType.DontPass;
}

const SINGLE_ROLL_BETS = new Set<BetType>([
  BetType.Field,
  BetType.Craps,
  BetType.Eleven,
  BetType.CrapsEleven,
  BetType.Seven,
  BetType.AnyCraps,
  BetType.Horn2,
  BetType.Horn3,
  BetType.Horn11,
  BetType.Horn12,
  BetType.HornBet,
  BetType.Hop,
  BetType.HoppingHardWay,
]);

/** Bet types that can be toggled on/off */
export const TOGGLABLE_BETS = new Set<BetType>([
  BetType.Place,
  BetType.Buy,
  BetType.Lay,
  BetType.PassLineOdds,
  BetType.DontPassOdds,
  BetType.ComeOdds,
  BetType.DontComeOdds,
  BetType.HardWay,
]);

/** Maximum odds multipliers by point (standard 3-4-5x odds) */
export const MAX_ODDS_MULTIPLIERS: Record<PointNumber, number> = {
  4: 3,
  5: 4,
  6: 5,
  8: 5,
  9: 4,
  10: 3,
};
