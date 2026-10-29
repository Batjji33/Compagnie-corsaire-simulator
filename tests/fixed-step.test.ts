import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FixedStep } from '../src/core/FixedStep.ts';

test('simulation advances equally at 30 and 144 render frames per second', () => {
  const simulate = (fps: number) => {
    const clock = new FixedStep(1 / 60, 0.15, 8);
    let count = 0;
    for (let frame = 0; frame < fps * 10; frame++) clock.advance(1 / fps, () => count++);
    return count;
  };
  assert.equal(simulate(30), 600);
  assert.equal(simulate(144), 600);
});
test('long stall has bounded catch-up; resume does not retain backlog', () => {
  const clock = new FixedStep(1 / 60, 0.15, 8);
  let count = 0;
  const alpha = clock.advance(10, () => count++);
  assert.equal(count, 8);
  assert.ok(alpha >= 0 && alpha < 1);
  clock.resetAccumulator();
  clock.advance(1 / 60, () => count++);
  assert.equal(count, 9);
});
