export const TIME_RATES = [1, 2, 4, 8] as const;
export type TimeRate = typeof TIME_RATES[number];

/** Session-only choice. Safety never restores the player's previous rate. */
export class TimeAcceleration {
  private rate: TimeRate = 1;
  get multiplier(): TimeRate { return this.rate; }
  select(rate: TimeRate, danger?: string): boolean {
    if (!TIME_RATES.includes(rate)) return false;
    if (rate !== 1 && danger) { this.rate = 1; return false; }
    this.rate = rate;
    return true;
  }
  enforce(danger?: string): boolean {
    if (!danger || this.rate === 1) return false;
    this.rate = 1;
    return true;
  }
  reset(): void { this.rate = 1; }
}
