import { CONFIG } from '../config';
import type { Quality } from '../config';
import type { Settings } from '../saves/settings';
import { VIEWS } from '../world/geography';
import type { ViewId } from '../world/geography';
import { bayMapMarkup } from './BayMap';
import { icon } from './icons';

export class Interface {
  readonly canvas: HTMLCanvasElement;
  readonly fps: HTMLOutputElement;
  readonly status: HTMLElement;
  readonly pause: HTMLButtonElement;
  private abort = new AbortController();
  private movementFrame = 0;
  constructor(root: HTMLElement, settings: Settings, actions: {
    quality: (quality: Quality) => void; fps: (show: boolean) => void;
    pause: () => void; reset: () => void; zoom: (factor: number) => void;
    view: (id: ViewId) => void; move: (forward: number, right: number) => void;
    exploring:()=>boolean;
  }) {
    root.innerHTML = `
      <header class="topbar">
        <div class="identity"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 23h24l-5 5H9zM16 3v17H5zM19 8l9 12h-9" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><div><h1>Compagnie Corsaire <span>Simulator</span></h1><p>Saint-Malo · Dinard</p></div></div>
        <nav class="header-actions" aria-label="Outils de navigation"><button id="map-toggle" aria-expanded="false" aria-controls="bay-map" title="Carte de la baie">${icon('map')}<span>Carte</span></button><button id="settings-toggle" aria-expanded="false" aria-controls="settings" title="Réglages">${icon('settings')}<span>Réglages</span></button></nav>
      </header>
      <section class="viewport" aria-label="Environnement maritime 3D">
        <canvas tabindex="0" aria-label="Vue de la mer. Glissez pour orienter la caméra, pincez pour zoomer." aria-describedby="camera-help"></canvas>
        <div class="scene-caption"><label class="sr-only" for="view-select">Caméra et exploration</label><select id="view-select"><option value="">À bord du Corsaire</option>${Object.entries(VIEWS).map(([id,view])=>`<option value="${id}">${view.label}</option>`).join('')}</select></div>
        ${bayMapMarkup()}
        <div class="voyage-overlays"></div>
        <output id="fps" hidden aria-label="Images par seconde">Mesure…</output>
        <aside id="settings" hidden aria-label="Réglages graphiques">
          <div class="panel-title"><h2>Réglages</h2><button id="settings-close" aria-label="Fermer les réglages">${icon('close')}</button></div>
          <label for="quality">Qualité graphique</label>
          <select id="quality">${Object.entries(CONFIG.quality).map(([id, q]) => `<option value="${id}">${q.label} · ${q.fps} FPS max.</option>`).join('')}</select>
          <p>Le profil léger privilégie la fluidité sur tablette.</p>
          <label class="check"><input id="fps-toggle" type="checkbox" /> Afficher les FPS</label>
          <p class="storage-status" role="status"></p>
        </aside>
        <div class="camera-controls" role="group" aria-label="Commandes caméra"><button id="reset" aria-label="Recentrer sur le navire" title="Recentrer sur le navire">${icon('center')}</button><button id="zoom-in" aria-label="Rapprocher la caméra" title="Rapprocher">${icon('plus')}</button><button id="zoom-out" aria-label="Éloigner la caméra" title="Éloigner">${icon('minus')}</button></div>
        <div class="travel-controls" aria-label="Déplacer la caméra dans la baie"><button id="move-left" aria-label="Déplacer à gauche">←</button><button id="move-forward" aria-label="Avancer dans la baie">↑</button><button id="move-back" aria-label="Reculer dans la baie">↓</button><button id="move-right" aria-label="Déplacer à droite">→</button></div>
        <p class="portrait-note">Pour une vue plus large, tournez votre appareil.</p>
      </section>
      <footer><div class="voyage-status"><span id="state" role="status">Initialisation…</span><p id="camera-help">Glisser : regarder · Deux doigts : déplacer / zoomer</p></div><button id="pause" aria-pressed="false">${icon('pause')}<span>Pause</span></button></footer>`;
    const get = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
    this.canvas = get('canvas'); this.fps = get('#fps'); this.status = get('#state'); this.pause = get('#pause');
    const panel = get('#settings');
    const toggle = get<HTMLButtonElement>('#settings-toggle');
    const show = (open: boolean) => { panel.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); if (open) { get('#bay-map').hidden=true; get('#map-toggle').setAttribute('aria-expanded','false'); get('#quality').focus(); } else toggle.focus(); };
    const options = { signal: this.abort.signal };
    const map=get('#bay-map'), mapToggle=get('#map-toggle');
    mapToggle.addEventListener('click',()=> { map.hidden=!map.hidden; mapToggle.setAttribute('aria-expanded',String(!map.hidden)); if(!map.hidden) { panel.hidden=true; toggle.setAttribute('aria-expanded','false'); } },options);
    get('#map-close').addEventListener('click',()=>{map.hidden=true;mapToggle.setAttribute('aria-expanded','false');mapToggle.focus();},options);
    const view=get<HTMLSelectElement>('#view-select');
    view.addEventListener('change',()=> {if(view.value)actions.view(view.value as ViewId);else actions.reset();},options);
    const stopMovement=()=>cancelAnimationFrame(this.movementFrame);
    window.addEventListener('blur',stopMovement,options);
    document.addEventListener('visibilitychange',stopMovement,options);
    for(const [id,forward,right] of [['move-forward',120,0],['move-back',-120,0],['move-left',0,-120],['move-right',0,120]] as const) {
      const button=get(`#${id}`);
      button.addEventListener('click',(event)=> { if(event.detail===0) actions.move(forward,right); },options);
      button.addEventListener('pointerdown',(event)=> {
        if(event.button!==0)return;
        stopMovement(); button.setPointerCapture(event.pointerId);
        let previous=performance.now();
        const tick=(now:number)=> { const dt=Math.min(.05,(now-previous)/1000); previous=now; actions.move(forward*dt*1.5,right*dt*1.5); this.movementFrame=requestAnimationFrame(tick); };
        this.movementFrame=requestAnimationFrame(tick);
      },options);
      for(const type of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(type,stopMovement,options);
    }
    toggle.addEventListener('click', () => show(Boolean(panel.hidden)), options);
    get('#settings-close').addEventListener('click', () => show(false), options);
    root.addEventListener('keydown', (event) => { if (event.key === 'Escape') { if(!panel.hidden) show(false); if(!map.hidden) { map.hidden=true; mapToggle.setAttribute('aria-expanded','false'); mapToggle.focus(); } root.querySelector<HTMLDetailsElement>('.helm-help')?.removeAttribute('open'); } }, options);
    const quality = get<HTMLSelectElement>('#quality'); quality.value = settings.quality;
    quality.addEventListener('change', () => actions.quality(quality.value as Quality), options);
    const fps = get<HTMLInputElement>('#fps-toggle'); fps.checked = settings.showFps; this.fps.hidden = !settings.showFps;
    fps.addEventListener('change', () => { this.fps.hidden = !fps.checked; actions.fps(fps.checked); }, options);
    this.pause.addEventListener('click', actions.pause, options);
    get('#reset').addEventListener('click', () => { view.value=''; actions.reset(); }, options);
    get('#zoom-in').addEventListener('click', () => actions.zoom(0.8), options);
    get('#zoom-out').addEventListener('click', () => actions.zoom(1.25), options);
    this.canvas.addEventListener('keydown', (event) => {
      if (event.key === '+' || event.key === '=') actions.zoom(0.8);
      if (event.key === '-') actions.zoom(1.25);
      if (event.key.toLowerCase() === 'r') { view.value=''; actions.reset(); }
      const movement: Record<string,[number,number]>={w:[120,0],z:[120,0],s:[-120,0],a:[0,-120],q:[0,-120],d:[0,120]};
      const shift=movement[event.key.toLowerCase()];
      if(shift&&actions.exploring()) { event.preventDefault(); actions.move(...shift); }
    }, options);
  }
  setShipView():void {(document.querySelector('#view-select') as HTMLSelectElement).value='';}
  updatePosition(x: number, z: number): void {
    const dot=document.getElementById('map-camera'); dot?.setAttribute('cx',String(x)); dot?.setAttribute('cy',String(z));
  }
  storageWarning(): void { document.querySelector('.storage-status')!.textContent = 'Réglages conservés pour cette session uniquement : stockage indisponible.'; }
  dispose(): void { cancelAnimationFrame(this.movementFrame); this.abort.abort(); }
}
