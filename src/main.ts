import './style.css';
import { CONFIG } from './config';
import { SimulationLoop } from './core/SimulationLoop';
import { showError } from './core/errors';
import { FpsMeter } from './instruments/FpsMeter';
import { loadSettings, saveSettings } from './saves/settings';
import { Interface } from './ui/Interface';
import { World } from './world/World';

let dispose: (() => void) | undefined;
try {
  const settings = loadSettings();
  const meter = new FpsMeter();
  let world: World;
  let loop: SimulationLoop;
  const persist = () => { if (!saveSettings(settings)) ui.storageWarning(); };
  const ui = new Interface(document.querySelector('#app')!, settings, {
    quality: (quality) => { settings.quality = quality; world.setQuality(quality); loop.fps = CONFIG.quality[quality].fps; meter.reset(); persist(); },
    fps: (show) => { settings.showFps = show; meter.reset(); persist(); },
    pause: () => {
      loop.paused = !loop.paused;
      ui.pause.textContent = loop.paused ? 'Reprendre' : 'Pause';
      ui.pause.setAttribute('aria-pressed', String(loop.paused));
      ui.status.textContent = loop.paused ? 'Mer en pause · Caméra libre' : 'Mer animée · Caméra libre';
    },
    reset: () => world.resetCamera(), zoom: (factor) => world.zoom(factor),
  });
  world = new World(ui.canvas, settings.quality);
  // Future physics, ships and missions register their fixed updates here.
  loop = new SimulationLoop(() => {}, (dt, time) => {
    world.render(dt, time);
    const fps = meter.sample(performance.now());
    if (settings.showFps && fps !== null) ui.fps.textContent = `${fps} FPS`;
  }, showError);
  loop.fps = CONFIG.quality[settings.quality].fps;
  const abort = new AbortController();
  const options = { signal: abort.signal };
  const observer = new ResizeObserver(() => world.resize());
  observer.observe(ui.canvas);
  window.addEventListener('resize', () => world.resize(), options);
  document.addEventListener('visibilitychange', () => {
    meter.reset();
    if (document.hidden) loop.stop(); else if (!document.getElementById('fatal-error')) loop.start();
  }, options);
  ui.canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault(); loop.stop();
    showError(new Error('Le contexte graphique a été perdu. Fermez les onglets inutilisés puis rechargez la scène.'));
  }, options);
  window.addEventListener('error', (event) => { loop.stop(); showError(event.error ?? new Error(event.message)); }, options);
  window.addEventListener('unhandledrejection', (event) => { loop.stop(); showError(event.reason); }, options);
  // Arrow keys rotate only while the canvas is focused; UI keys retain their normal behavior.
  ui.canvas.addEventListener('keydown', (event) => {
    const directions: Record<string, [number, number]> = { ArrowLeft: [-0.08, 0], ArrowRight: [0.08, 0], ArrowUp: [0, -0.04], ArrowDown: [0, 0.04] };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const offset = world.camera.position.clone().sub(world.controls.target);
    const radius = offset.length();
    const theta = Math.atan2(offset.x, offset.z) + direction[0];
    const phi = Math.max(world.controls.minPolarAngle, Math.min(world.controls.maxPolarAngle, Math.acos(offset.y / radius) + direction[1]));
    offset.setFromSphericalCoords(radius, phi, theta);
    world.camera.position.copy(world.controls.target).add(offset);
    world.controls.update();
  }, options);
  world.resize();
  ui.status.textContent = 'Mer animée · Caméra libre';
  loop.start();
  dispose = () => { loop.stop(); observer.disconnect(); abort.abort(); ui.dispose(); world.dispose(); };
} catch (error) { showError(error); }
if (import.meta.hot) import.meta.hot.dispose(() => dispose?.());
