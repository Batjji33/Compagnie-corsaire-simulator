export class FpsMeter {
  private frames = 0;
  private since = performance.now();
  sample(now: number): number | null {
    this.frames++;
    if (now - this.since < 1000) return null;
    const fps = Math.round(this.frames * 1000 / (now - this.since));
    this.frames = 0;
    this.since = now;
    return fps;
  }
  reset(): void { this.frames = 0; this.since = performance.now(); }
}
