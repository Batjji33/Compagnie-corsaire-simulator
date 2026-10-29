import { CONFIG } from '../config';
import type { Quality } from '../config';
import type { Settings } from '../saves/settings';

export class Interface {
  readonly canvas: HTMLCanvasElement;
  readonly fps: HTMLOutputElement;
  readonly status: HTMLElement;
  readonly pause: HTMLButtonElement;
  private abort = new AbortController();
  constructor(root: HTMLElement, settings: Settings, actions: {
    quality: (quality: Quality) => void; fps: (show: boolean) => void;
    pause: () => void; reset: () => void; zoom: (factor: number) => void;
  }) {
    root.innerHTML = `
      <header class="topbar">
        <div class="identity"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 23h24l-5 5H9zM16 3v17H5zM19 8l9 12h-9" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><div><h1>Compagnie Corsaire <span>Simulator</span></h1><p>Saint-Malo · Dinard</p></div></div>
        <button id="settings-toggle" aria-expanded="false" aria-controls="settings">Réglages</button>
      </header>
      <section class="viewport" aria-label="Environnement maritime 3D">
        <canvas tabindex="0" aria-label="Vue de la mer. Glissez pour orienter la caméra, pincez pour zoomer." aria-describedby="camera-help"></canvas>
        <div class="scene-caption"><span>Environnement d’essai</span><strong>Au large, tout commence.</strong><p>Phase 0 · Fondations techniques</p></div>
        <output id="fps" hidden aria-label="Images par seconde">Mesure…</output>
        <aside id="settings" hidden aria-label="Réglages graphiques">
          <div class="panel-title"><h2>Réglages</h2><button id="settings-close" aria-label="Fermer les réglages">×</button></div>
          <label for="quality">Qualité graphique</label>
          <select id="quality">${Object.entries(CONFIG.quality).map(([id, q]) => `<option value="${id}">${q.label} · ${q.fps} FPS max.</option>`).join('')}</select>
          <p>Le profil léger privilégie la fluidité sur tablette.</p>
          <label class="check"><input id="fps-toggle" type="checkbox" /> Afficher les FPS</label>
          <p class="storage-status" role="status"></p>
        </aside>
        <div class="camera-controls" aria-label="Commandes caméra"><button id="zoom-in" aria-label="Rapprocher la caméra">+</button><button id="zoom-out" aria-label="Éloigner la caméra">−</button><button id="reset">Recentrer</button></div>
        <p class="portrait-note">Pour une vue plus large, tournez votre appareil.</p>
      </section>
      <footer><div><span id="state" role="status">Initialisation…</span><p id="camera-help">Glisser pour regarder · Pincer pour zoomer</p></div><button id="pause" aria-pressed="false">Pause</button></footer>`;
    const get = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
    this.canvas = get('canvas'); this.fps = get('#fps'); this.status = get('#state'); this.pause = get('#pause');
    const panel = get('#settings');
    const toggle = get<HTMLButtonElement>('#settings-toggle');
    const show = (open: boolean) => { panel.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); if (open) get('#quality').focus(); else toggle.focus(); };
    const options = { signal: this.abort.signal };
    toggle.addEventListener('click', () => show(Boolean(panel.hidden)), options);
    get('#settings-close').addEventListener('click', () => show(false), options);
    root.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !panel.hidden) show(false); }, options);
    const quality = get<HTMLSelectElement>('#quality'); quality.value = settings.quality;
    quality.addEventListener('change', () => actions.quality(quality.value as Quality), options);
    const fps = get<HTMLInputElement>('#fps-toggle'); fps.checked = settings.showFps; this.fps.hidden = !settings.showFps;
    fps.addEventListener('change', () => { this.fps.hidden = !fps.checked; actions.fps(fps.checked); }, options);
    this.pause.addEventListener('click', actions.pause, options);
    get('#reset').addEventListener('click', actions.reset, options);
    get('#zoom-in').addEventListener('click', () => actions.zoom(0.8), options);
    get('#zoom-out').addEventListener('click', () => actions.zoom(1.25), options);
    this.canvas.addEventListener('keydown', (event) => {
      if (event.key === '+' || event.key === '=') actions.zoom(0.8);
      if (event.key === '-') actions.zoom(1.25);
      if (event.key.toLowerCase() === 'r') actions.reset();
    }, options);
  }
  storageWarning(): void { document.querySelector('.storage-status')!.textContent = 'Réglages conservés pour cette session uniquement : stockage indisponible.'; }
  dispose(): void { this.abort.abort(); }
}
