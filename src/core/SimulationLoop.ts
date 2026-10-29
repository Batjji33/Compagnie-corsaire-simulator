import { CONFIG } from '../config';
import { FixedStep } from './FixedStep';

export class SimulationLoop {
  private clock = new FixedStep(CONFIG.simulation.step, CONFIG.simulation.maxFrame, CONFIG.simulation.maxSteps);
  private id = 0;
  private previous = 0;
  private lastRender = 0;
  private running = false;
  private visualTime = 0;
  paused = false;
  fps: number = 30;
  constructor(private update: (dt: number, time: number) => void,
    private render: (dt: number, time: number) => void, private onError: (error: unknown) => void) {}
  start(): void {
    if (this.running) return;
    this.running = true;
    this.previous = this.lastRender = performance.now();
    this.clock.resetAccumulator();
    this.id = requestAnimationFrame(this.tick);
  }
  stop(): void { this.running = false; cancelAnimationFrame(this.id); }
  private tick = (now: number): void => {
    if (!this.running) return;
    try {
      const dt = (now - this.previous) / 1000;
      this.previous = now;
      const alpha = this.paused ? 0 : this.clock.advance(dt, this.update);
      if (!this.paused) this.visualTime = this.clock.time + alpha * this.clock.step;
      const interval = 1000 / this.fps;
      if (now - this.lastRender >= interval - 0.5) {
        this.render(Math.min((now - this.lastRender) / 1000, 0.1), this.visualTime);
        this.lastRender = now - ((now - this.lastRender) % interval);
      }
      this.id = requestAnimationFrame(this.tick);
    } catch (error) { this.stop(); this.onError(error); }
  };
}
