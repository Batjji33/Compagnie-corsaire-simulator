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
  advance(delta: number, update: (dt: number, time: number) => void): number {
    this.accumulator += Math.min(Math.max(delta, 0), this.maxFrame);
    let steps = 0;
    while (this.accumulator + 1e-10 >= this.step && steps < this.maxSteps) {
      this.time += this.step;
      update(this.step, this.time);
      this.accumulator = Math.max(0, this.accumulator - this.step);
      steps++;
    }
    if (steps === this.maxSteps) this.accumulator %= this.step;
    return this.accumulator / this.step;
  }
  resetAccumulator(): void { this.accumulator = 0; }
}
