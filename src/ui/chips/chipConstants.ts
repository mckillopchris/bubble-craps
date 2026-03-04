// ============================================================
// Shared chip denomination values and colors
// Used by ChipRack (selectable) and BetChip (on-table display)
// ============================================================

export const CHIP_VALUES = [1, 5, 10, 25, 100, 500] as const;

export const CHIP_COLORS: Record<number, string> = {
  1: '#f0f0f0',
  5: '#cc3333',
  10: '#3366cc',
  25: '#33aa33',
  100: '#111111',
  500: '#9933cc',
};

/**
 * Get the chip color for a given dollar amount.
 * Returns the color of the highest denomination chip <= the amount.
 */
export function getChipColorForAmount(amount: number): string {
  for (let i = CHIP_VALUES.length - 1; i >= 0; i--) {
    const val = CHIP_VALUES[i]!;
    if (val <= amount) {
      return CHIP_COLORS[val] ?? '#cc3333';
    }
  }
  return CHIP_COLORS[1] ?? '#f0f0f0';
}

/** Returns true if the chip needs dark text (white $1 chip). */
export function isLightChip(amount: number): boolean {
  for (let i = CHIP_VALUES.length - 1; i >= 0; i--) {
    const val = CHIP_VALUES[i]!;
    if (val <= amount) {
      return val === 1;
    }
  }
  return true;
}
