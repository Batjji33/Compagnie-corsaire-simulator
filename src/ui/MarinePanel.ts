import type { Vessel } from '../ships/Vessel';
import { instruments, SEA, SHOALS } from '../weather/Marine';
import type { SeaState } from '../weather/Marine';
import { ROCKS } from '../world/geography';
import type { InstrumentLayout } from '../saves/GameStore';
import type { Traffic } from '../traffic/Traffic';

/** UI samples physics at 5 Hz; no independent instrument simulation. */
export class MarinePanel {
  private abort=new AbortController();
  private panels:HTMLElement[]=[];
  private timer=0;
  private alert:HTMLElement;
  constructor(private vessel:Vessel,private traffic?:Traffic) {
    const m=vessel.marine,options={signal:this.abort.signal};
    const settings=document.querySelector('#settings')!;
    settings.insertAdjacentHTML('beforeend',`<h2>Mer et navigation</h2>
      <p>Données fictives. Ne jamais utiliser pour naviguer réellement.</p>
      <label for="sea-state">État de mer visé</label><select id="sea-state"><option value="calme">Calme</option><option value="belle" selected>Belle mer</option><option value="agitee">Mer agitée</option></select>
      <label for="wind-direction">Vent venant de (degrés)</label><input id="wind-direction" type="range" min="0" max="359" value="250">
      <label for="marine-hour">Heure simulée</label><input id="marine-hour" type="range" min="0" max="23.9" step=".1" value="14">
      <label for="tide-phase">Phase de marée (0–360°)</label><input id="tide-phase" type="range" min="0" max="360" value="0">
      ${[['evolving','Météo évolutive'],['dayCycle','Cycle jour / nuit · 24 min'],['tideCycle','Marée · cycle de 12 min'],['damageEnabled','Dégâts et perte de puissance'],['sound','Alertes sonores']].map(([key,label])=>`<label class="check"><input type="checkbox" data-marine="${key}" checked>${label}</label>`).join('')}
      <button id="repair-hull">Réparer le navire</button><h2>Instruments</h2>
      <p>Glissez les poignées pour déplacer les panneaux. Au clavier : flèches sur la poignée.</p>
      <div id="instrument-switches"></div><button id="reset-instruments">Replacer les instruments</button>`);
    settings.querySelector<HTMLSelectElement>('#sea-state')!.addEventListener('change',e=>{const value=(e.target as HTMLSelectElement).value;if(value in SEA)m.sea=value as SeaState;},options);
    for(const [id,set] of [['wind-direction',(v:number)=>m.targetDirection=v],['marine-hour',(v:number)=>m.hour=v],['tide-phase',(v:number)=>m.tidePhase=v*Math.PI/180]] as const) {
      settings.querySelector<HTMLInputElement>(`#${id}`)!.addEventListener('input',e=>set(Number((e.target as HTMLInputElement).value)),options);
    }
    settings.querySelectorAll<HTMLInputElement>('[data-marine]').forEach(input=>input.addEventListener('change',()=>{
      const key=input.dataset.marine as 'evolving'|'dayCycle'|'tideCycle'|'damageEnabled'|'sound';m[key]=input.checked;
    },options));
    settings.querySelector('#repair-hull')!.addEventListener('click',()=>{m.damage=0;},options);
    const viewport=document.querySelector<HTMLElement>('.viewport')!;
    this.alert=document.createElement('div');this.alert.className='marine-alert';this.alert.setAttribute('role','status');viewport.append(this.alert);
    this.addPanel('navigation','Navigation',`<div class="marine-readings"><div>Compas / cap<strong id="nav-heading"></strong></div><div>Vitesse fond<strong id="nav-speed"></strong></div><div>Sondeur<strong id="nav-depth"></strong></div><div>Sous la quille<strong id="nav-clearance"></strong></div></div><p id="nav-condition"></p><p id="nav-tide"></p><p id="nav-hull"></p><p id="nav-position"></p><small>Simulation fictive · carte GPS via « Carte »</small>`,!matchMedia('(max-width:600px)').matches);
    const quick=document.createElement('button');quick.className='instrument-quick';quick.textContent='Instruments';quick.setAttribute('aria-controls','marine-navigation');
    const toggleNavigation=()=>{const checkbox=document.querySelector<HTMLInputElement>('#instrument-switches input')!;checkbox.checked=!checkbox.checked;checkbox.dispatchEvent(new Event('change'));};
    quick.addEventListener('click',toggleNavigation,options);viewport.append(quick);
    this.addPanel('radar','Radar · nord en haut',`<svg id="radar-screen" viewBox="-160 -160 320 320" role="img" aria-label="Obstacles dans un rayon de 500 mètres"><defs><clipPath id="radar-clip"><circle r="150"/></clipPath></defs><circle class="radar-ring" r="150"/><circle class="radar-ring" r="75"/><path class="radar-ring" d="M-150 0H150 M0 -150V150"/><g id="radar-returns" clip-path="url(#radar-clip)"></g><path id="radar-ship" d="M0 -9L5 7L0 4L-5 7Z"/><text x="-5" y="-136">N</text></svg><small>Portée 500 m · côtes, quais, rochers<br>Hauts-fonds en pointillés · trafic mobile en vert</small><p id="radar-traffic-status"></p>`,false);
    settings.querySelector('#reset-instruments')!.addEventListener('click',()=>{for(const panel of this.panels){panel.style.left='';panel.style.top='';}this.clampPanels();},options);
    window.addEventListener('resize',()=>this.clampPanels(),options);
    // Make the original GPS map movable without replacing its controls or contents.
    const map=document.querySelector<HTMLElement>('#bay-map')!;
    const handle=document.createElement('button');handle.className='instrument-handle';handle.textContent='Déplacer la carte GPS';map.prepend(handle);this.drag(map,handle);
    this.refresh();
  }
  syncSettings():void {
    const m=this.vessel.marine;
    (document.querySelector('#sea-state') as HTMLSelectElement).value=m.sea;
    for(const [id,value] of [['wind-direction',m.targetDirection],['marine-hour',m.hour],['tide-phase',m.tidePhase*180/Math.PI]] as const)(document.getElementById(id) as HTMLInputElement).value=String(value);
    document.querySelectorAll<HTMLInputElement>('[data-marine]').forEach(input=>{input.checked=m[input.dataset.marine as 'evolving'|'dayCycle'|'tideCycle'|'damageEnabled'|'sound'];});
  }
  captureLayout():InstrumentLayout {
    const layout:InstrumentLayout={};
    for(const el of [...this.panels,document.getElementById('bay-map')!])layout[el.id]={visible:!el.hidden,left:el.style.left?parseFloat(el.style.left):null,top:el.style.top?parseFloat(el.style.top):null};
    return layout;
  }
  restoreLayout(layout:InstrumentLayout):void {
    for(const el of [...this.panels,document.getElementById('bay-map')!]){
      const saved=layout[el.id];if(!saved)continue;el.hidden=!saved.visible;
      if(saved.left!==null&&saved.top!==null)this.place(el,saved.left,saved.top);
    }
    document.querySelectorAll<HTMLInputElement>('#instrument-switches input').forEach((input,i)=>{input.checked=!this.panels[i].hidden;});
    document.getElementById('map-toggle')?.setAttribute('aria-expanded',String(!document.getElementById('bay-map')!.hidden));
  }
  private addPanel(id:string,title:string,content:string,visible:boolean):void {
    const panel=document.createElement('aside');panel.id=`marine-${id}`;panel.className='marine-panel';panel.hidden=!visible;
    panel.innerHTML=`<div class="instrument-title"><button class="instrument-handle" aria-label="Déplacer ${title}">${title} ↔</button><button class="instrument-close" aria-label="Masquer ${title}">×</button></div>${content}`;
    document.querySelector('.viewport')!.append(panel);this.panels.push(panel);
    const label=document.createElement('label');label.className='check';label.innerHTML=`<input type="checkbox" ${visible?'checked':''}>${title}`;document.querySelector('#instrument-switches')!.append(label);
    const checkbox=label.querySelector('input')!,options={signal:this.abort.signal};
    checkbox.addEventListener('change',()=>{panel.hidden=!checkbox.checked;this.clampPanels();},options);
    panel.querySelector('.instrument-close')!.addEventListener('click',()=>{panel.hidden=true;checkbox.checked=false;},options);
    this.drag(panel,panel.querySelector<HTMLElement>('.instrument-handle')!);
  }
  private place(panel:HTMLElement,x:number,y:number):void {
    const parent=panel.parentElement!;
    panel.style.left=`${Math.max(0,Math.min(parent.clientWidth-panel.offsetWidth,x))}px`;
    panel.style.top=`${Math.max(0,Math.min(parent.clientHeight-48,y))}px`;
    panel.style.right='auto';
  }
  private clampPanels():void {for(const p of this.panels)if(!p.hidden)this.place(p,p.offsetLeft,p.offsetTop);}
  private drag(panel:HTMLElement,handle:HTMLElement):void {
    let drag:{id:number;x:number;y:number;left:number;top:number}|undefined;
    const options={signal:this.abort.signal};
    handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:panel.offsetLeft,top:panel.offsetTop};handle.setPointerCapture(e.pointerId);},options);
    handle.addEventListener('pointermove',e=>{if(drag?.id===e.pointerId)this.place(panel,drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);},options);
    for(const type of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(type,()=>{drag=undefined;},options);
    handle.addEventListener('keydown',e=>{const moves:Record<string,[number,number]>={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]};const move=moves[e.key];if(move){e.preventDefault();e.stopPropagation();this.place(panel,panel.offsetLeft+move[0],panel.offsetTop+move[1]);}},options);
  }
  update(dt:number):void {
    this.timer+=dt;if(this.timer<.2)return;this.timer=0;this.refresh();
  }
  private refresh():void {
    const s=this.vessel.dynamics.state,m=this.vessel.marine,reading=instruments(s);
    document.querySelector('.instrument-quick')?.setAttribute('aria-expanded',String(!this.panels[0].hidden));
    const set=(id:string,text:string)=>{document.getElementById(id)!.textContent=text;};
    set('nav-position',`GPS local : E ${s.x.toFixed(0)} m · S ${s.z.toFixed(0)} m`);
    set('nav-heading',`${String(reading.heading).padStart(3,'0')}°`);set('nav-speed',`${reading.speed.toFixed(1)} nd`);
    set('nav-depth',`${m.depth.toFixed(1)} m`);set('nav-clearance',`${m.clearance.toFixed(1)} m`);
    set('nav-condition',`Vent ${m.wind.toFixed(0)} nd de ${Math.round(m.direction)%360}° · Vagues ${m.waves.toFixed(1)} m · Visibilité ${(m.visibility/1000).toFixed(1)} km`);
    set('nav-tide',`${String(Math.floor(m.hour)).padStart(2,'0')}:${String(Math.floor(m.hour%1*60)).padStart(2,'0')} · Marée ${m.tide.toFixed(1)} m ${m.tideCycle?(Math.cos(m.tidePhase)>=0?'↗':'↘'):'fixe'} · Courant ${(Math.hypot(m.currentX,m.currentZ)/.514444).toFixed(1)} nd`);
    set('nav-hull',`Coque ${Math.round((1-m.damage)*100)} % · Puissance disponible ${Math.round(m.performance*100)} %${m.damageEnabled?'':' · Dégâts désactivés'}`);
    this.alert.hidden=!m.warning;if(this.alert.textContent!==m.warning)this.alert.textContent=m.warning;
    if(document.querySelector<HTMLElement>('#marine-radar')!.hidden)return;
    const point=(x:number,z:number)=>`${((x-s.x)*.3).toFixed(1)},${((z-s.z)*.3).toFixed(1)}`;
    document.getElementById('radar-returns')!.innerHTML=this.vessel.contact.obstacles.map(o=>`<polygon points="${o.polygon.map(p=>point(...p)).join(' ')}"/>`).join('')+ROCKS.map(r=>`<circle cx="${(r.x-s.x)*.3}" cy="${(r.z-s.z)*.3}" r="${r.radius*.7*.3}"/>`).join('')+SHOALS.map(a=>`<ellipse class="radar-shoal" cx="${(a.x-s.x)*.3}" cy="${(a.z-s.z)*.3}" rx="${a.rx*.3}" ry="${a.rz*.3}"/>`).join('');
    const traffic=this.traffic?.enabled?this.traffic.agents.filter(a=>a.active):[];
    document.getElementById('radar-returns')!.innerHTML+=traffic.map(a=>`<path data-traffic="${a.route.id}" class="radar-traffic ${a.route.id===this.traffic?.risk?.id?'risk':''}" d="M0 -6L4 5L0 3L-4 5Z" transform="translate(${point(a.x,a.z).replace(',', ' ')}) rotate(${a.heading*180/Math.PI})"/>`).join('');
    document.getElementById('radar-traffic-status')!.textContent=this.traffic?.risk?`Croisement : ${this.traffic.risk.name} - ${Math.round(this.traffic.risk.distance)} m`:`${traffic.length} navires actifs dans la baie`;
    document.getElementById('radar-ship')!.setAttribute('transform',`rotate(${reading.heading})`);
  }
  dispose():void {this.abort.abort();for(const panel of this.panels)panel.remove();this.alert.remove();}
}
