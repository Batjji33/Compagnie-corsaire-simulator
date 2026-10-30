import { BOAT, clamp, ENGINE_NOTCHES, engineNotch } from '../ships/parameters';
import type { VesselDynamics } from '../physics/VesselDynamics';
import type { CameraMode } from '../world/VesselCamera';
import { instruments } from '../weather/Marine';
import { DOCKS } from '../world/geography';
import { icon } from './icons';

const engineControl = (key: 'port' | 'starboard', name: string) => `
  <div class="engine-control" data-engine="${key}">
    <span class="engine-name">${name}</span>
    <button id="${key}-up" class="engine-step" aria-label="Augmenter le moteur ${name.toLowerCase()} d’un cran">${icon('up')}</button>
    <button id="${key}-neutral" class="engine-neutral" aria-label="Moteur ${name.toLowerCase()} au neutre"><output id="${key}-command" class="engine-command" aria-live="off">N</output><small>Neutre</small></button>
    <div class="engine-notches" aria-hidden="true">${[-3,-2,-1,0,1,2,3].map(n=>`<i data-notch="${n}"></i>`).join('')}</div>
    <button id="${key}-down" class="engine-step" aria-label="Réduire le moteur ${name.toLowerCase()} d’un cran">${icon('down')}</button>
    <small id="${key}-actual">Poussée 0 %</small>
  </div>`;

export class HelmControls {
  private enabled = true;
  private abort = new AbortController();
  private keys = new Set<string>();
  private steering = new Map<number, number>();
  private repeats = new Map<number, ReturnType<typeof setTimeout>>();
  private panel: HTMLElement;
  private help: HTMLDetailsElement;
  private elapsed = 0;
  constructor(private dynamics: VesselDynamics, private camera: (mode: CameraMode)=>void, private mode: ()=>CameraMode) {
    this.panel = document.createElement('section');
    this.panel.className = 'helm';
    this.panel.setAttribute('aria-label','Poste de conduite du Corsaire d’Émeraude');
    // All regions float over the sea; the middle remains available to the camera.
    this.panel.innerHTML = `
      <div class="helm-engines hud-surface" role="group" aria-label="Propulsion indépendante, sept crans par moteur">
        <div class="control-heading">Propulsion <span>Deux moteurs</span></div>
        ${engineControl('port','Bâbord')}${engineControl('starboard','Tribord')}
        <button id="all-neutral" aria-label="Deux moteurs au neutre">Deux au neutre <kbd>␣</kbd></button>
      </div>
      <div class="helm-center">
        <div class="helm-instruments hud-surface">
          <span class="vessel-name">Corsaire d’Émeraude</span>
          <div class="readings"><span>Vitesse fond<strong id="ship-speed"><span id="ship-speed-value">0,0</span> <small>nd</small></strong></span><span>Cap compas<strong id="ship-heading">270°</strong></span><span>Sous quille<strong id="ship-clearance"><span id="ship-clearance-value">—</span> <small>m</small></strong></span></div>
          <svg class="compass-tape" viewBox="0 0 300 22" aria-hidden="true"><defs><clipPath id="compass-clip"><rect width="300" height="22"/></clipPath></defs><g clip-path="url(#compass-clip)"><g id="compass-marks">${Array.from({length:73},(_,i)=>{const angle=(i-18)*10;return `<path d="M${i*20} 0v${angle%30===0?6:3}"/><text x="${i*20}" y="19">${angle%30===0?({0:'N',90:'E',180:'S',270:'O'}[((angle%360)+360)%360]??String(((angle%360)+360)%360)):''}</text>`;}).join('')}</g></g><path class="compass-index" d="m146 0 4 5 4-5"/></svg>
        </div>
        <p id="berth-distance" class="berth-distance">Cale de Dinan</p>
      </div>
      <div class="ship-cameras hud-surface" role="group" aria-label="Vue du navire"><button id="camera-external" aria-pressed="true">Extérieur</button><button id="camera-cockpit" aria-pressed="false">Passerelle</button></div>
      <div class="rudder-control hud-surface">
        <div class="control-heading">Barre <output id="rudder-angle">0°</output></div>
        <svg class="rudder-gauge" viewBox="0 0 200 58" aria-hidden="true"><path class="gauge-track" d="M20 48Q100 -28 180 48"/><path class="gauge-ticks" d="M20 48l-3-6M59 22l-3-6M100 11V4M141 22l3-6M180 48l3-6"/><path id="rudder-needle" d="M100 54V17"/><circle cx="100" cy="54" r="3"/><text x="16" y="57">B</text><text x="178" y="57">T</text></svg>
        <div class="steering-buttons"><button id="rudder-port" aria-label="Barre à bâbord, maintenir pour tourner">${icon('left')}</button><button id="rudder-center" aria-label="Ramener la barre au milieu"><span>0°</span><small>Au milieu</small></button><button id="rudder-starboard" aria-label="Barre à tribord, maintenir pour tourner">${icon('right')}</button></div>
        <p id="rudder-demand">Consigne 0°</p>
        <div class="helm-actions"></div>
      </div>`;
    const app = document.querySelector('#app')!;
    app.classList.add('piloting');
    app.insertBefore(this.panel,app.querySelector('footer'));
    this.help = document.createElement('details');
    this.help.className = 'helm-help';
    this.help.innerHTML = `<summary aria-label="Aide au pilotage">${icon('help')}<span>Aide</span></summary><p>Maintenez les flèches pour orienter la barre ; au relâchement, elle garde sa consigne. Un appui bref ajuste l’angle de 1°. Les moteurs ont sept crans : AR3, AR2, AR1, N, AV1, AV2, AV3. Inversez la poussée pour ralentir.<br><br>Clavier : ↑ / ↓ deux moteurs · Q / A bâbord · E / D tribord · ← / → barre · X au milieu · Espace au neutre · C caméra. Glisser sur la mer : regarder ; deux doigts : zoomer.</p>`;
    app.querySelector('footer')!.insertBefore(this.help,app.querySelector('#pause'));
    const get = <T extends HTMLElement>(id: string)=>this.panel.querySelector<T>(`#${id}`)!;
    const options = {signal:this.abort.signal};
    for (const key of ['port','starboard'] as const) {
      for (const [suffix,direction] of [['up',1],['down',-1]] as const) {
        const button=get<HTMLButtonElement>(`${key}-${suffix}`);
        const step=()=> {if(this.enabled&&this.mode()!=='explore')this.set({[key]:ENGINE_NOTCHES[clamp(engineNotch(this.dynamics.command[key])+direction,0,6)]});};
        button.addEventListener('click',e=>{if(e.detail===0)step();},options);
        button.addEventListener('pointerdown',e=>{
          if(e.button!==0||!this.enabled||this.mode()==='explore')return;
          e.preventDefault();button.setPointerCapture(e.pointerId);step();
          const repeat=()=>{step();this.repeats.set(e.pointerId,setTimeout(repeat,300));};
          this.repeats.set(e.pointerId,setTimeout(repeat,450));
        },options);
        for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,e=>this.stopPointer((e as PointerEvent).pointerId),options);
      }
      get(`${key}-neutral`).addEventListener('click',()=>{this.clearKeys();this.set({[key]:0});},options);
    }
    for(const [id,direction] of [['rudder-port',-1],['rudder-starboard',1]] as const) {
      const button=get<HTMLButtonElement>(id);
      const step=()=>this.set({rudder:this.dynamics.command.rudder+direction/BOAT.rudderMaxDegrees});
      button.addEventListener('click',e=>{if(e.detail===0&&this.enabled&&this.mode()!=='explore')step();},options);
      button.addEventListener('pointerdown',e=>{
        if(e.button!==0||!this.enabled||this.mode()==='explore')return;
        e.preventDefault();button.setPointerCapture(e.pointerId);step();this.steering.set(e.pointerId,direction);button.classList.add('held');
      },options);
      for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,e=>{this.stopPointer((e as PointerEvent).pointerId);button.classList.remove('held');},options);
    }
    get('all-neutral').addEventListener('click',()=>{this.clearKeys();this.set({port:0,starboard:0});},options);
    get('rudder-center').addEventListener('click',()=>{this.clearKeys();this.set({rudder:0});},options);
    get('camera-external').addEventListener('click',()=>this.camera('external'),options);
    get('camera-cockpit').addEventListener('click',()=>this.camera('cockpit'),options);
    window.addEventListener('keydown',event=>{
      if(!this.enabled||event.ctrlKey||event.altKey||event.metaKey)return;
      if(event.target instanceof HTMLElement&&event.target.closest('button,summary,dialog,input,select,textarea'))return;
      const key=event.key.toLowerCase();
      if(key==='c'&&!event.repeat){event.preventDefault();this.camera(this.mode()==='cockpit'?'external':'cockpit');return;}
      if(this.mode()==='explore')return;
      const engineKeys:Record<string,readonly ['port'|'starboard',number][]>={arrowup:[['port',1],['starboard',1]],arrowdown:[['port',-1],['starboard',-1]],q:[['port',1]],a:[['port',-1]],e:[['starboard',1]],d:[['starboard',-1]]};
      if(engineKeys[key]){event.preventDefault();for(const [engine,direction] of engineKeys[key])this.set({[engine]:ENGINE_NOTCHES[clamp(engineNotch(this.dynamics.command[engine])+direction,0,6)]});return;}
      if(['arrowleft','arrowright','x',' '].includes(key)){
        event.preventDefault();this.keys.add(key);
        if(key===' ')this.set({port:0,starboard:0});if(key==='x')this.set({rudder:0});
      }
    },options);
    window.addEventListener('keyup',event=>this.keys.delete(event.key.toLowerCase()),options);
    window.addEventListener('blur',()=>this.clearKeys(),options);
    document.addEventListener('visibilitychange',()=>this.clearKeys(),options);
    this.refresh();
  }
  private stopPointer(id: number): void {clearTimeout(this.repeats.get(id));this.repeats.delete(id);this.steering.delete(id);}
  private set(command: Parameters<VesselDynamics['setCommand']>[0]): void {this.dynamics.setCommand(command);this.refresh();}
  update(dt: number): void {
    if(!this.enabled)return;
    if(this.mode()!=='explore'){
      const direction=clamp(Number(this.keys.has('arrowright'))-Number(this.keys.has('arrowleft'))+[...this.steering.values()].reduce((a,b)=>a+b,0),-1,1);
      if(direction)this.dynamics.setCommand({rudder:this.dynamics.command.rudder+direction*dt*.65});
    } else this.clearKeys();
    this.elapsed+=dt;if(this.elapsed>.1){this.elapsed=0;this.refresh();}
  }
  refresh(): void {
    const c=this.dynamics.command,s=this.dynamics.state;
    const set=(id:string,value:string)=>{const el=this.panel.querySelector(`#${id}`)!;if(el.textContent!==value)el.textContent=value;};
    for(const key of ['port','starboard'] as const){
      const notch=engineNotch(c[key])-3,label=notch===0?'N':`${notch>0?'AV':'AR'}${Math.abs(notch)}`;
      set(`${key}-command`,label);
      this.panel.querySelector(`#${key}-neutral`)!.setAttribute('aria-label',`${key==='port'?'Bâbord':'Tribord'} : ${label}, ${Math.round(c[key]*100)} %. Remettre au neutre`);
      this.panel.querySelector(`[data-engine="${key}"]`)!.setAttribute('data-direction',notch<0?'astern':notch>0?'ahead':'neutral');
      this.panel.querySelectorAll<HTMLElement>(`[data-engine="${key}"] [data-notch]`).forEach(tick=>tick.classList.toggle('selected',Number(tick.dataset.notch)===notch));
      set(`${key}-actual`,`${Math.round(s[key]*100*this.dynamics.powerFactor*(s[key]<0?BOAT.reverseEfficiency:1))} % poussée`);
    }
    const angle=Math.round(s.rudder*180/Math.PI),demand=Math.round(c.rudder*BOAT.rudderMaxDegrees),reading=instruments(s);
    set('rudder-angle',`${Math.abs(angle)}°${angle<0?' B':angle>0?' T':''}`);
    set('rudder-demand',`Consigne ${Math.abs(demand)}°${demand<0?' bâbord':demand>0?' tribord':''}`);
    this.panel.querySelector('#rudder-needle')!.setAttribute('transform',`rotate(${angle*1.6} 100 54)`);
    set('ship-speed-value',reading.speed.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1}));
    set('ship-heading',`${String(reading.heading%360).padStart(3,'0')}°`);
    this.panel.querySelector('#compass-marks')!.setAttribute('transform',`translate(${150-(reading.heading+180)*2} 0)`);
    const nearest=DOCKS.map(d=>({name:d.id==='malo'?'Cale de Dinan':'Clair de Lune',distance:Math.hypot(s.x-d.point[0],s.z-d.point[1])})).sort((a,b)=>a.distance-b.distance)[0];
    set('berth-distance',`${nearest.name} · ${Math.round(nearest.distance)} m`);
    for(const mode of ['external','cockpit'] as const)this.panel.querySelector(`#camera-${mode}`)!.setAttribute('aria-pressed',String(this.mode()===mode));
    const exploring=this.mode()==='explore';
    document.querySelector('#app')!.classList.toggle('exploring',exploring);
    this.panel.querySelectorAll<HTMLButtonElement>('.helm-engines button,.rudder-control button:not(#fog-horn)').forEach(el=>{el.disabled=!this.enabled||exploring;});
    const dot=document.getElementById('map-vessel');dot?.setAttribute('transform',`translate(${s.x} ${s.z}) rotate(${s.heading*180/Math.PI})`);
  }
  clearKeys(): void {this.keys.clear();for(const id of this.repeats.keys())this.stopPointer(id);this.steering.clear();this.panel.querySelectorAll('.held').forEach(el=>el.classList.remove('held'));}
  setEnabled(enabled: boolean): void {if(this.enabled===enabled)return;this.enabled=enabled;this.clearKeys();this.refresh();}
  dispose(): void {this.clearKeys();this.abort.abort();this.panel.remove();this.help.remove();}
}
