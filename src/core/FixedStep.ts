/** Fixed simulation clock. Excess catch-up time is dropped to avoid a spiral of death. */
export class FixedStep {
  private accumulator = 0;
  time = 0;
  readonly step: number;
  private maxFrame: number;
  private maxSteps: number;
  constructor(step: number, maxFrame: number, maxSteps: number) {
    this.step = step; this.maxFrame = maxFrame; this.maxSteps = maxSteps;
  }
  advance(delta: number, update: (dt: number, time: number) => void, scale: () => number = () => 1, active: () => boolean = () => true): number {
    if (!Number.isFinite(delta)) return this.accumulator / this.step;
    // Accumulate REAL seconds: a safety change to x1 also affects the rest of this frame.
    this.accumulator += Math.min(Math.max(delta, 0), this.maxFrame);
    let steps = 0;
    while (steps < this.maxSteps) {
      if (!active()) { this.resetAccumulator(); return 0; }
      const duration = this.step / scale();
      if (this.accumulator + 1e-10 < duration) break;
      this.accumulator = Math.max(0, this.accumulator - duration);
      this.time += this.step;
      update(this.step, this.time);
      steps++;
    }
    const duration = this.step / scale();
    if (steps === this.maxSteps) this.accumulator %= duration;
    return this.accumulator / duration;
  }
  resetAccumulator(): void { this.accumulator = 0; }
}
