// ============================================================
// Core Types for Bubble Craps Game Engine
// ============================================================

/** Individual die value (1-6) */
export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

/** Combined dice total (2-12) */
export type DiceTotal = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** Point numbers in standard craps */
export type PointNumber = 4 | 5 | 6 | 8 | 9 | 10;

/** Result of a single dice roll */
export interface DiceOutcome {
  die1: DieValue;
  die2: DieValue;
  total: DiceTotal;
  isHardWay: boolean; // both dice show same value
}

/** Phases of the craps game cycle */
export enum GamePhase {
  ComeOut = 'COME_OUT',
  Point = 'POINT',
}

/** Bet resolution result */
export enum BetResult {
  Win = 'WIN',
  WinStay = 'WIN_STAY', // pays out but bet stays on table (e.g. Place bets)
  Lose = 'LOSE',
  Push = 'PUSH',
  Active = 'ACTIVE', // bet remains on table
}

/** All bet types available in standard craps */
export enum BetType {
  // Contract bets
  PassLine = 'PASS_LINE',
  DontPass = 'DONT_PASS',

  // Multi-roll bets
  PassLineOdds = 'PASS_LINE_ODDS',
  DontPassOdds = 'DONT_PASS_ODDS',
  Come = 'COME',
  DontCome = 'DONT_COME',
  ComeOdds = 'COME_ODDS',
  DontComeOdds = 'DONT_COME_ODDS',
  Place = 'PLACE',
  Buy = 'BUY',
  Lay = 'LAY',
  Big6 = 'BIG_6',
  Big8 = 'BIG_8',
  HardWay = 'HARD_WAY',

  // Single-roll bets
  Field = 'FIELD',
  Craps = 'CRAPS_BET', // C bet
  Eleven = 'ELEVEN', // E bet
  CrapsEleven = 'CRAPS_ELEVEN', // C&E bet
  Seven = 'SEVEN',
  AnyCraps = 'ANY_CRAPS',
  Horn2 = 'HORN_2', // Snake Eyes (1-1)
  Horn3 = 'HORN_3', // Ace-Deuce (1-2)
  Horn11 = 'HORN_11', // Yo (5-6)
  Horn12 = 'HORN_12', // Boxcars (6-6)
  HornBet = 'HORN_BET', // Combined horn (split 4 ways)
  Hop = 'HOP',
  HoppingHardWay = 'HOPPING_HARD_WAY',

  // Side bets
  LuckyShooter = 'LUCKY_SHOOTER',
  LuckyRollerLow = 'LUCKY_ROLLER_LOW',
  LuckyRollerHigh = 'LUCKY_ROLLER_HIGH',
  LuckyRollerAll = 'LUCKY_ROLLER_ALL',
}

/** A specific dice combination for hop bets */
export interface DiceCombination {
  die1: DieValue;
  die2: DieValue;
}

/** A placed bet on the table */
export interface Bet {
  id: string;
  type: BetType;
  amount: number;
  /** For Place/Buy/Lay/Come/DontCome bets - which point number */
  pointNumber?: PointNumber;
  /** For HardWay bets - which hard way (4, 6, 8, or 10) */
  hardWayTotal?: 4 | 6 | 8 | 10;
  /** For Hop/HoppingHardWay bets - specific dice combination */
  diceCombination?: DiceCombination;
  /** Whether this bet is currently active (on) or off */
  isOn: boolean;
  /** Whether this is a contract bet (cannot be removed once point established) */
  isContract: boolean;
  /** Commission already paid (for Buy/Lay bets) */
  commissionPaid: number;
  /** Parent bet ID for odds bets */
  parentBetId?: string;
}

/** Result of resolving a single bet */
export interface BetResolution {
  bet: Bet;
  result: BetResult;
  payout: number; // net payout (0 for loss, bet amount returned + winnings for win)
}

/** The full game state */
export interface GameState {
  phase: GamePhase;
  point: PointNumber | null;
  bets: Bet[];
  credits: number;
  rollHistory: DiceOutcome[];
  comePoints: Map<string, PointNumber>; // betId -> point number
  dontComePoints: Map<string, PointNumber>;
  /** Tracks rolls since last hard way for display */
  rollsSinceHardWay: Record<4 | 6 | 8 | 10, number>;
  /** Whether multi-roll bets are set to on */
  betsOn: boolean;
  /** Last bet configuration for repeat */
  lastBetConfig: Array<{ type: BetType; amount: number; pointNumber?: PointNumber; hardWayTotal?: 4 | 6 | 8 | 10; diceCombination?: DiceCombination }>;
  /** Total won on last roll */
  lastWin: number;
  /** Lucky Shooter: unique point numbers hit during current shooter's turn */
  luckyShooterHits: PointNumber[];
  /** Lucky Roller: totals hit since last 7 (for Low/High/All tracking) */
  luckyRollerHits: DiceTotal[];
}

/** Payout odds expressed as [pays, for] meaning "pays X for Y wagered" */
export interface PayoutOdds {
  pays: number;
  per: number;
}
