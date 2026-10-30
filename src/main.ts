import './style.css';
import { MarinePanel } from './ui/MarinePanel';
import { CONFIG } from './config';
import { SimulationLoop } from './core/SimulationLoop';
import { showError } from './core/errors';
import { FpsMeter } from './instruments/FpsMeter';
import { GameStore } from './saves/GameStore';
import { Game } from './ui/Game';
import { Interface } from './ui/Interface';
import { World } from './world/World';
import { HelmControls } from './ui/HelmControls';

let dispose: (() => void) | undefined;
async function boot():Promise<void> {
  const store=new GameStore();
  const settings=(await store.load()).settings;
  const meter = new FpsMeter();
  let world: World;
  let loop: SimulationLoop;
  let helm:HelmControls;
  let game:Game;
  const persist = () => { void store.save().then(()=>{if(!store.available)ui.storageWarning();}); };
  const ui = new Interface(document.querySelector('#app')!, settings, {
    quality: (quality) => { settings.quality = quality; world.setQuality(quality); loop.fps = CONFIG.quality[quality].fps; meter.reset(); persist(); },
    fps: (show) => { settings.showFps = show; meter.reset(); persist(); },
    pause: () => game.togglePause(),
    reset: () => world.resetCamera(), zoom: (factor) => world.zoom(factor),
    view: (id) => world.setView(id), move: (forward,right) => world.move(forward,right),
    exploring:()=>world?.vesselCamera.mode==='explore',
  });
  world = new World(ui.canvas, settings.quality);
  helm=new HelmControls(world.vessel.dynamics,(mode)=>{world.setCameraMode(mode);ui.setShipView();helm.refresh();},()=>world.vesselCamera.mode);
  const marinePanel=new MarinePanel(world.vessel,world.traffic);
  loop = new SimulationLoop((dt) => {game.update(dt);}, (dt, time, alpha) => {
    world.render(dt, time, alpha);
    marinePanel.update(dt);
    game.render(dt);
    const fps = meter.sample(performance.now());
    if (settings.showFps && fps !== null) ui.fps.textContent = `${fps} FPS`;
    if (fps !== null) {ui.updatePosition(world.camera.position.x,world.camera.position.z);helm.refresh();}
  }, showError);
  loop.fps = CONFIG.quality[settings.quality].fps;
  game=new Game(world,helm,ui,marinePanel,store,paused=>{loop.paused=paused;});
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
    if(world.vesselCamera.mode!=='explore')return;
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
  ui.status.textContent = 'Menu principal';
  loop.start();
  dispose = () => { loop.stop(); observer.disconnect(); abort.abort(); game.dispose(); marinePanel.dispose(); helm.dispose(); ui.dispose(); world.dispose(); };
}
void boot().catch(showError);
if (import.meta.hot) import.meta.hot.dispose(() => dispose?.());
