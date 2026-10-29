import { BOAT, KNOT, clamp } from '../ships/parameters';
import type { VesselDynamics } from '../physics/VesselDynamics';
import type { CameraMode } from '../world/VesselCamera';
import { DOCKS } from '../world/geography';

export class HelmControls {
  private abort=new AbortController();
  private keys=new Set<string>();
  private panel:HTMLElement;
  private port:HTMLInputElement;
  private starboard:HTMLInputElement;
  private rudder:HTMLInputElement;
  private elapsed=0;
  constructor(private dynamics:VesselDynamics,private camera:(mode:CameraMode)=>void,private mode:()=>CameraMode) {
    this.panel=document.createElement('section');this.panel.className='helm';this.panel.setAttribute('aria-label','Poste de conduite du Corsaire d’Émeraude');
    this.panel.innerHTML=`
      <div class="helm-instruments"><strong>Corsaire d’Émeraude</strong><div class="readings"><span>Vitesse<strong id="ship-speed">0,0 nd</strong></span><span>Cap<strong id="ship-heading">270°</strong></span></div><p id="berth-distance">Cale de Dinan</p><div class="ship-cameras"><button id="camera-external" aria-pressed="true">Extérieur</button><button id="camera-cockpit" aria-pressed="false">Cockpit</button></div></div>
      <div class="engine-control"><label for="engine-port">Bâbord <output id="port-command">N</output></label><div class="lever"><span>AV</span><input id="engine-port" type="range" min="-100" max="100" step="1" value="0" aria-label="Propulsion bâbord" orient="vertical"/><span>AR</span></div><button id="port-neutral" aria-label="Moteur bâbord au neutre">Neutre</button><small id="port-actual">Poussée 0 %</small></div>
      <div class="engine-control"><label for="engine-starboard">Tribord <output id="starboard-command">N</output></label><div class="lever"><span>AV</span><input id="engine-starboard" type="range" min="-100" max="100" step="1" value="0" aria-label="Propulsion tribord" orient="vertical"/><span>AR</span></div><button id="starboard-neutral" aria-label="Moteur tribord au neutre">Neutre</button><small id="starboard-actual">Poussée 0 %</small></div>
      <div class="rudder-control"><div class="rudder-title"><label for="rudder">Barre</label><output id="rudder-angle">0°</output></div><input id="rudder" type="range" min="-35" max="35" step="1" value="0" aria-label="Angle de barre"/><div class="rudder-scale"><span>35° bâbord</span><span>35° tribord</span></div><div class="helm-actions"><button id="rudder-center">Au milieu</button><button id="all-neutral">Deux moteurs au neutre</button></div><details><summary>Clavier et manœuvre</summary><p>↑ / ↓ : deux moteurs · Q / A : bâbord · E / D : tribord · ← / → : barre · X : barre au milieu · Espace : neutre · C : caméra. Le neutre ne freine pas instantanément ; inversez progressivement pour ralentir.</p></details></div>`;
    const app=document.querySelector('#app')!;app.classList.add('piloting');app.insertBefore(this.panel,app.querySelector('footer'));
    const get=<T extends HTMLElement>(id:string)=>this.panel.querySelector<T>(`#${id}`)!;
    this.port=get('engine-port');this.starboard=get('engine-starboard');this.rudder=get('rudder');
    const options={signal:this.abort.signal};
    const input=(key:'port'|'starboard'|'rudder',element:HTMLInputElement,divisor:number)=>element.addEventListener('input',()=>{this.dynamics.setCommand({[key]:Number(element.value)/divisor});this.refresh();},options);
    input('port',this.port,100);input('starboard',this.starboard,100);input('rudder',this.rudder,BOAT.rudderMaxDegrees);
    get('port-neutral').addEventListener('click',()=>this.set({port:0}),options);get('starboard-neutral').addEventListener('click',()=>this.set({starboard:0}),options);
    get('all-neutral').addEventListener('click',()=>this.set({port:0,starboard:0}),options);get('rudder-center').addEventListener('click',()=>this.set({rudder:0}),options);
    get('camera-external').addEventListener('click',()=>this.camera('external'),options);get('camera-cockpit').addEventListener('click',()=>this.camera('cockpit'),options);
    window.addEventListener('keydown',(event)=>{
      if(event.ctrlKey||event.altKey||event.metaKey||event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement||event.target instanceof HTMLTextAreaElement)return;
      const key=event.key.toLowerCase();
      if(key==='c'&&!event.repeat){event.preventDefault();this.camera(this.mode()==='cockpit'?'external':'cockpit');return;}
      if(this.mode()==='explore')return;
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
    if(this.mode()!=='explore') {
      const held=(key:string)=>Number(this.keys.has(key));
      const common=held('arrowup')-held('arrowdown');
      const c=this.dynamics.command;
      this.dynamics.setCommand({port:c.port+(common+held('q')-held('a'))*dt*.35,starboard:c.starboard+(common+held('e')-held('d'))*dt*.35,rudder:c.rudder+(held('arrowright')-held('arrowleft'))*dt*.65});
    }
    this.elapsed+=dt;if(this.elapsed>.1){this.elapsed=0;this.refresh();}
  }
  refresh():void {
    const c=this.dynamics.command,s=this.dynamics.state;
    const set=(id:string,value:string)=>{this.panel.querySelector(`#${id}`)!.textContent=value;};
    for(const key of ['port','starboard'] as const) {
      this[key].value=String(Math.round(c[key]*100));
      const value=Math.round(c[key]*100),label=value===0?'N':`${value>0?'AV':'AR'} ${Math.abs(value)} %`;
      this[key].setAttribute('aria-valuetext',label);set(`${key}-command`,label);set(`${key}-actual`,`Poussée ${Math.round(s[key]*100*(s[key]<0?BOAT.reverseEfficiency:1))} %`);
    }
    this.rudder.value=String(Math.round(c.rudder*BOAT.rudderMaxDegrees));
    set('rudder-angle',`${Math.round(s.rudder*180/Math.PI)}° / ${Math.round(c.rudder*BOAT.rudderMaxDegrees)}° demandé`);
    set('ship-speed',`${(s.surge/KNOT).toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})} nd`);
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
  dispose():void {this.abort.abort();this.panel.remove();}
}
