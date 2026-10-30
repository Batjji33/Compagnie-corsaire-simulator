import { BOAT, clamp, ENGINE_NOTCHES, engineNotch } from '../ships/parameters';
import type { VesselDynamics } from '../physics/VesselDynamics';
import type { CameraMode } from '../world/VesselCamera';
import { instruments } from '../weather/Marine';
import { DOCKS } from '../world/geography';

const engineLever=(key:'port'|'starboard',name:string)=>`<div class="engine-control"><label for="engine-${key}">${name}<output id="${key}-command">Neutre\n0 %</output></label><div class="lever"><input id="engine-${key}" type="range" min="-3" max="3" step="1" value="0" aria-label="Propulsion ${name.toLowerCase()}, sept crans" orient="vertical"/><div class="lever-notches" aria-hidden="true">${[3,2,1,0,-1,-2,-3].map(n=>`<span data-notch="${n}">${n===0?'N':`${n>0?'AV':'AR'}${Math.abs(n)}`}</span>`).join('')}</div></div><button id="${key}-neutral" aria-label="Moteur ${name.toLowerCase()} au neutre">Neutre</button><small id="${key}-actual">Poussée 0 %</small></div>`;

export class HelmControls {
  private enabled=true;
  private abort=new AbortController();
  private keys=new Set<string>();
  private panel:HTMLElement;
  private port:HTMLInputElement;
  private starboard:HTMLInputElement;
  private rudder:HTMLInputElement;
  private help:HTMLDetailsElement;
  private elapsed=0;
  constructor(private dynamics:VesselDynamics,private camera:(mode:CameraMode)=>void,private mode:()=>CameraMode) {
    this.panel=document.createElement('section');this.panel.className='helm';this.panel.setAttribute('aria-label','Poste de conduite du Corsaire d’Émeraude');
    this.panel.innerHTML=`
      <div class="helm-instruments"><strong>Corsaire d’Émeraude</strong><div class="readings"><span>Vitesse fond<strong id="ship-speed">0,0 nd</strong></span><span>Cap<strong id="ship-heading">270°</strong></span></div><p id="berth-distance">Cale de Dinan</p><div class="ship-cameras"><button id="camera-external" aria-pressed="true">Extérieur</button><button id="camera-cockpit" aria-pressed="false">Cockpit</button></div></div>
      ${engineLever('port','Bâbord')}
      ${engineLever('starboard','Tribord')}
      <div class="rudder-control"><div class="rudder-title"><label for="rudder">Barre</label><output id="rudder-angle">0°</output></div><input id="rudder" type="range" min="-35" max="35" step="1" value="0" aria-label="Angle de barre"/><div class="rudder-scale"><span>35° bâbord</span><span>35° tribord</span></div><div class="helm-actions"><button id="rudder-center">Au milieu</button><button id="all-neutral" aria-label="Deux moteurs au neutre">Deux au neutre</button></div><details><summary>Clavier et manœuvre</summary><p>↑ / ↓ : deux moteurs · Q / A : bâbord · E / D : tribord · un cran par pression, répétition si maintenu · ← / → : barre · X : barre au milieu · Espace : neutre · C : caméra. Sept crans : arrière 3/2/1 (−100/−65/−30 %), neutre, avant 1/2/3 (+30/+65/+100 %). La poussée évolue progressivement ; inversez pour ralentir.</p></details></div>`;
    const engines=document.createElement('div');engines.className='helm-engines';engines.setAttribute('role','group');engines.setAttribute('aria-label','Propulsion des deux moteurs');
    engines.append(...this.panel.querySelectorAll('.engine-control'));
    const center=document.createElement('div');center.className='helm-center';
    center.append(this.panel.querySelector('.helm-instruments')!);
    this.panel.prepend(engines,center);
    const app=document.querySelector('#app')!;app.classList.add('piloting');app.insertBefore(this.panel,app.querySelector('footer'));
    this.help=this.panel.querySelector<HTMLDetailsElement>('details')!;this.help.className='helm-help';
    app.querySelector('footer')!.insertBefore(this.help,app.querySelector('#pause'));
    const get=<T extends HTMLElement>(id:string)=>this.panel.querySelector<T>(`#${id}`)!;
    this.port=get('engine-port');this.starboard=get('engine-starboard');this.rudder=get('rudder');
    const options={signal:this.abort.signal};
    for(const key of ['port','starboard'] as const)this[key].addEventListener('input',()=>this.set({[key]:ENGINE_NOTCHES[clamp(Number(this[key].value)+3,0,6)]}),options);
    this.rudder.addEventListener('input',()=>this.set({rudder:Number(this.rudder.value)/BOAT.rudderMaxDegrees}),options);
    get('port-neutral').addEventListener('click',()=>this.set({port:0}),options);get('starboard-neutral').addEventListener('click',()=>this.set({starboard:0}),options);
    get('all-neutral').addEventListener('click',()=>this.set({port:0,starboard:0}),options);get('rudder-center').addEventListener('click',()=>this.set({rudder:0}),options);
    get('camera-external').addEventListener('click',()=>this.camera('external'),options);get('camera-cockpit').addEventListener('click',()=>this.camera('cockpit'),options);
    window.addEventListener('keydown',(event)=>{
      if(!this.enabled)return;
      if(event.target instanceof HTMLElement&&event.target.closest('button,summary,dialog'))return;
      if(event.ctrlKey||event.altKey||event.metaKey||event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement||event.target instanceof HTMLTextAreaElement)return;
      const key=event.key.toLowerCase();
      if(key==='c'&&!event.repeat){event.preventDefault();this.camera(this.mode()==='cockpit'?'external':'cockpit');return;}
      if(this.mode()==='explore')return;
      const engineKeys:Record<string,readonly ['port'|'starboard',number][]>={arrowup:[['port',1],['starboard',1]],arrowdown:[['port',-1],['starboard',-1]],q:[['port',1]],a:[['port',-1]],e:[['starboard',1]],d:[['starboard',-1]]};
      if(engineKeys[key]){
        event.preventDefault();
        for(const [engine,direction] of engineKeys[key])this.set({[engine]:ENGINE_NOTCHES[clamp(engineNotch(this.dynamics.command[engine])+direction,0,6)]});
        return;
      }
      if(['arrowup','arrowdown','arrowleft','arrowright','q','a','e','d','x',' '].includes(key)) {
        event.preventDefault();this.keys.add(key);
        if(key===' ')this.set({port:0,starboard:0});if(key==='x')this.set({rudder:0});
      }
    },options);
    window.addEventListener('keyup',event=>this.keys.delete(event.key.toLowerCase()),options);
    window.addEventListener('blur',()=>this.keys.clear(),options);document.addEventListener('visibilitychange',()=>this.keys.clear(),options);
    this.refresh();
  }
  private set(command:Parameters<VesselDynamics['setCommand']>[0]):void {this.dynamics.setCommand(command);this.refresh();}
  update(dt:number):void {
    if(!this.enabled)return;
    if(this.mode()!=='explore') {
      const held=(key:string)=>Number(this.keys.has(key));
      const c=this.dynamics.command;
      this.dynamics.setCommand({rudder:c.rudder+(held('arrowright')-held('arrowleft'))*dt*.65});
    }
    this.elapsed+=dt;if(this.elapsed>.1){this.elapsed=0;this.refresh();}
  }
  refresh():void {
    const c=this.dynamics.command,s=this.dynamics.state;
    const set=(id:string,value:string)=>{this.panel.querySelector(`#${id}`)!.textContent=value;};
    for(const key of ['port','starboard'] as const) {
      const notch=engineNotch(c[key])-3,value=Math.round(c[key]*100),label=notch===0?'Neutre':`${notch>0?'Avant':'Arrière'} ${Math.abs(notch)}`,percent=`${value>0?'+':''}${value} %`;
      this[key].value=String(notch);this[key].setAttribute('aria-valuetext',`${label}, ${percent}`);set(`${key}-command`,`${label}\n${percent}`);
      this[key].parentElement!.querySelectorAll<HTMLElement>('[data-notch]').forEach(tick=>tick.classList.toggle('selected',Number(tick.dataset.notch)===notch));
      set(`${key}-actual`,`Poussée ${Math.round(s[key]*100*this.dynamics.powerFactor*(s[key]<0?BOAT.reverseEfficiency:1))} %`);
    }
    this.rudder.value=String(Math.round(c.rudder*BOAT.rudderMaxDegrees));
    set('rudder-angle',`${Math.round(s.rudder*180/Math.PI)}° / ${Math.round(c.rudder*BOAT.rudderMaxDegrees)}° demandé`);
    set('ship-speed',`${instruments(s).speed.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})} nd`);
    set('ship-heading',`${Math.round(((s.heading*180/Math.PI)%360+360)%360)%360}°`);
    const nearest=DOCKS.map(d=>({name:d.id==='malo'?'Cale de Dinan':'Clair de Lune',distance:Math.hypot(s.x-d.point[0],s.z-d.point[1])})).sort((a,b)=>a.distance-b.distance)[0];
    set('berth-distance',`${nearest.name} · ${Math.round(nearest.distance)} m du centre du navire`);
    for(const mode of ['external','cockpit'] as const)this.panel.querySelector(`#camera-${mode}`)!.setAttribute('aria-pressed',String(this.mode()===mode));
    document.querySelector('#app')!.classList.toggle('exploring',this.mode()==='explore');
    const dot=document.getElementById('map-vessel');dot?.setAttribute('transform',`translate(${s.x} ${s.z}) rotate(${s.heading*180/Math.PI})`);
    // Clamp remains in the simulation; the DOM is never trusted as the safety boundary.
    this.rudder.setAttribute('aria-valuetext',`${clamp(c.rudder*BOAT.rudderMaxDegrees,-35,35).toFixed(0)} degrés`);
  }
  clearKeys():void {this.keys.clear();}
  setEnabled(enabled:boolean):void {
    if(this.enabled===enabled)return;
    this.enabled=enabled;this.clearKeys();
    this.panel.querySelectorAll<HTMLInputElement|HTMLButtonElement>('input,.helm-engines button,.rudder-control button').forEach(el=>{el.disabled=!enabled;});
  }
  dispose():void {this.abort.abort();this.panel.remove();this.help.remove();}
}
