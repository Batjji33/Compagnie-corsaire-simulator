import type { World } from '../world/World';
import type { HelmControls } from './HelmControls';
import type { Interface } from './Interface';
import type { MarinePanel } from './MarinePanel';
import { Mission, dockingStatus } from '../missions/Mission';
import type { Telemetry } from '../missions/Mission';
import { MISSIONS, MALO_DINARD } from '../missions/definitions';
import type { MissionDefinition, MissionPhase } from '../missions/definitions';
import { GameStore, readMarine, recordResult } from '../saves/GameStore';
import { SEA, SEA_LABELS, degrees } from '../weather/Marine';
import { MissionMarkers } from '../world/MissionMarkers';
import { Immersion } from './Immersion';
import { icon } from './icons';

const names:Record<MissionPhase,string>={preparation:'Préparation',boarding:'Embarquement',departure:'Départ',crossing:'Traversée',approach:'Approche',docking:'Accostage',unloading:'Débarquement',complete:'Bilan',failed:'Mission interrompue'};
const clock=(seconds:number)=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
const hourLabel=(hour:number)=>`${Math.floor(Math.round(hour*60)/60)%24}:${String(Math.round(hour*60)%60).padStart(2,'0')}`;
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export class Game {
  mission:Mission|undefined;
  private mode:'free'|'mission'='free';
  private started=false;
  private paused=true;
  private dialog=document.createElement('dialog');
  private hud=document.createElement('section');
  private menuButton=document.createElement('button');
  private abort=new AbortController();
  private markers=new MissionMarkers();
  private autosave=0;
  private renderTimer=0;
  private lastPhase:MissionPhase|undefined;
  private settingsPanel:HTMLElement;
  private previousFree:{x:number;z:number}|undefined;
  private immersion:Immersion;
  constructor(private world:World,private helm:HelmControls,private ui:Interface,private marinePanel:MarinePanel,private store:GameStore,private pauseLoop:(paused:boolean)=>void){
    const options={signal:this.abort.signal};
    this.settingsPanel=document.querySelector('#settings')!;
    this.dialog.id='game-menu';this.dialog.setAttribute('aria-labelledby','game-menu-title');
    this.dialog.innerHTML='<div class="game-dialog-header"><span>Compagnie Corsaire Simulator</span><button data-action="home" aria-label="Menu principal">Menu</button></div><div id="menu-content"></div>';
    document.querySelector('#app')!.append(this.dialog);
    this.menuButton.id='game-menu-toggle';this.menuButton.innerHTML=`${icon('menu')}<span>Menu</span>`;this.menuButton.setAttribute('aria-haspopup','dialog');
    this.menuButton.setAttribute('aria-label','Ouvrir le menu principal');
    document.querySelector('.header-actions')!.prepend(this.menuButton);
    this.menuButton.addEventListener('click',()=>this.show('home'),options);
    this.hud.id='mission-hud';this.hud.hidden=true;this.hud.setAttribute('aria-label','Objectif de mission');
    this.hud.innerHTML='<div class="objective-top"><strong id="objective-phase"></strong><span id="objective-time"></span></div><p id="objective-guidance"></p><div class="objective-actions"><button id="mission-action"></button><button id="mission-details" aria-expanded="false" aria-controls="objective-details">Journal de bord</button></div><div id="objective-details" hidden><p id="objective-comment"></p><ol id="objective-steps"></ol></div>';
    document.querySelector('.voyage-overlays')!.append(this.hud);
    this.hud.querySelector('#mission-action')!.addEventListener('click',()=>this.action(),options);
    this.hud.querySelector('#mission-details')!.addEventListener('click',()=>{const details=this.hud.querySelector<HTMLElement>('#objective-details')!;details.hidden=!details.hidden;this.hud.querySelector('#mission-details')!.setAttribute('aria-expanded',String(!details.hidden));},options);
    this.hud.addEventListener('keydown',e=>{if(e.key==='Escape'){this.hud.querySelector<HTMLElement>('#objective-details')!.hidden=true;this.hud.querySelector('#mission-details')!.setAttribute('aria-expanded','false');}},options);
    this.dialog.addEventListener('click',e=>{
      const button=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');if(!button)return;
      const action=button.dataset.action!;
      if(action==='resume')this.resume();else if(action==='resume-saved'){this.started=false;this.resume();}else if(action==='start-free')this.startFree();else if(action==='start-mission')this.prepare(MISSIONS.find(d=>d.id===button.dataset.mission)??MALO_DINARD);
      else if(action==='board'){this.mission?.board();this.launch();}
      else if(action==='restart'){this.prepare(this.mission?.definition??MALO_DINARD);}
      else if(action==='checkpoint')this.recover();else this.show(action);
    },options);
    this.dialog.addEventListener('cancel',e=>{e.preventDefault();if(this.started&&!this.mission?.finished)this.resume();},options);
    this.dialog.addEventListener('keydown',e=>{e.stopPropagation();},options);
    // Reuse the existing settings controls inside the modal, including their handlers.
    this.dialog.addEventListener('click',e=>{if((e.target as HTMLElement).closest('#settings-close')){e.preventDefault();e.stopImmediatePropagation();this.show('home');}}, {...options,capture:true});
    const savePreferences=()=>{
      if(!this.mission||this.mode==='free')this.store.data.marine=readMarine(this.world.vessel.marine);
      this.store.data.marine.sound=this.world.vessel.marine.sound;
      this.store.data.instruments=this.marinePanel.captureLayout();
      void this.store.save().then(()=>this.storageStatus());
    };
    this.settingsPanel.addEventListener('change',savePreferences,options);
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.started&&!this.paused){this.show('home');}},options);
    window.addEventListener('pagehide',()=>this.snapshot(),options);
    this.immersion=new Immersion(world,store,()=>this.show('excursions'));
    this.world.scene.add(this.markers.root);
    this.applyMarine(this.store.data.marine);
    this.marinePanel.restoreLayout(this.store.data.instruments);
    this.show('home');
  }
  private applyMarine(settings:ReturnType<typeof readMarine>):void {
    const m=this.world.vessel.marine;Object.assign(m,settings);
    [m.wind,m.waves,m.visibility]=[...SEA[m.sea]];m.direction=m.targetDirection;m.tide=2.4*Math.sin(m.tidePhase);
    this.marinePanel.syncSettings();
  }
  private setPaused(value:boolean):void {
    this.paused=value;this.pauseLoop(value);this.helm.clearKeys();this.helm.setEnabled(!value&&!this.world.vessel.moored);
    this.ui.pause.innerHTML=`${icon('pause')}<span>${value?'Reprendre':'Pause'}</span>`;this.ui.pause.setAttribute('aria-pressed',String(value));
    this.ui.pause.setAttribute('aria-label',value?'Reprendre la navigation':'Mettre en pause');
    this.immersion?.setPaused(value);
  }
  togglePause():void {if(!this.started){this.show('home');return;}if(this.paused)this.resume();else this.show('home');}
  private returnSettings():void {
    if(this.settingsPanel.parentElement!==document.querySelector('.viewport')){document.querySelector('.viewport')!.append(this.settingsPanel);this.settingsPanel.hidden=true;}
  }
  private show(screen:string):void {
    this.setPaused(true);this.snapshot();this.returnSettings();
    this.immersion.panel.remove();
    this.dialog.querySelector('#menu-content')!.innerHTML=this.markup(screen);
    if(screen==='settings'){
      this.settingsPanel.hidden=false;this.dialog.querySelector('#menu-content')!.append(this.settingsPanel);
      this.lockMissionSettings();
    }
    if(screen==='excursions'){this.dialog.querySelector('#menu-content')!.append(this.immersion.panel);this.immersion.sync();}
    if(!this.dialog.open)this.dialog.showModal();
    this.dialog.querySelector<HTMLElement>('#game-menu-title')?.focus();this.storageStatus();
  }
  private markup(screen:string):string {
    const title=(text:string)=>`<h2 id="game-menu-title" tabindex="-1">${text}</h2>`;
    const d=this.mission?.definition??MALO_DINARD;
    if(screen==='excursions')return title('Excursion et ambiance')+'<p>Choisissez les commentaires, préparez votre excursion et réglez les volumes. La navigation est en pause pendant la préparation.</p>';
    if(screen==='settings')return title('Paramètres')+'<p>Les réglages sont sauvegardés sur cet appareil. Pendant une mission, les conditions du briefing restent fixes.</p>';
    if(screen==='free')return title('Navigation libre')+`<p>Parcourez toute la baie, sans trajet imposé. Choisissez les conditions, puis prenez la barre.</p>${this.weatherChoices()}<button class="game-primary" data-action="start-free">Prendre la barre</button>`;
    if(screen==='missions')return title('Missions')+`<p>Une traversée complète, de l’embarquement au débarquement.</p>${MISSIONS.map(m=>`<article class="mission-choice"><h3>${escape(m.title)}</h3><p>${escape(m.description)}</p><p>5–6 min · ${m.cruiseKnots} nd conseillés · départ ${m.departureHour}:00</p><button data-action="start-mission" data-mission="${m.id}">Préparer la traversée</button></article>`).join('')}`;
    if(screen==='briefing')return title(escape(d.title))+`<p>${escape(d.description)}</p><div class="briefing-layout">${this.routeMarkup(d)}<div><h3>Feuille de traversée</h3><dl class="game-facts"><div><dt>Départ</dt><dd>${hourLabel(d.departureHour)} · ${escape(d.origin.name)}</dd></div><div><dt>Arrivée cible</dt><dd>${hourLabel(d.departureHour+d.targetSeconds/3600)} · ${escape(d.destination.name)}</dd></div><div><dt>Conditions</dt><dd>${SEA_LABELS[d.sea]} · vent ${SEA[d.sea][0]} nd de ${d.windDirection}° · vagues ${SEA[d.sea][1].toLocaleString('fr-FR')} m</dd></div><div><dt>Durée de jeu</dt><dd>Cible ${clock(d.targetSeconds)} · temps physique normal</dd></div></dl></div></div><p>Amarres en place. Chargez les ${d.passengers} passagers, puis larguez les amarres. Accostez dans la zone ocre, cap ${d.destination.headings.map(h=>`${Math.round(degrees(h))}°`).join(' ou ')}, à moins de ${d.docking.speedKnots.toLocaleString('fr-FR')} nd, au neutre pendant ${d.docking.holdSeconds} secondes.</p><p>La note dépend de la ponctualité, de la sécurité, du confort et des manœuvres. Les reprises au point sûr restent possibles avec une pénalité de manœuvre.</p><button class="game-primary" data-action="board">Embarquer les passagers</button>`;
    if(screen==='result'&&this.mission?.result){const r=this.mission.result;return title(r.completed?'Bienvenue à '+escape(d.destination.name.split(' · ')[0]):'Mission interrompue')+`<p>${escape(r.reason)}</p><div class="mission-score"><strong>${r.score}<small> / 100</small></strong><span>${escape(r.grade)}</span></div><dl class="score-breakdown">${[['Ponctualité',r.punctuality],['Sécurité',r.safety],['Confort',r.comfort],['Manœuvres',r.manoeuvres]].map(([label,value])=>`<div><dt>${label}</dt><dd>${value} / 100</dd></div>`).join('')}</dl><p>${r.passengers} passagers arrivés · ${clock(r.elapsed)} · ${r.metrics.contacts} contacts · ${r.metrics.recoveries} reprises</p><div class="game-buttons"><button data-action="restart">Recommencer</button>${!r.completed?'<button data-action="checkpoint">Reprendre au point sûr</button>':''}<button data-action="progress">Voir la progression</button></div>`;}
    if(screen==='progress'){
      const s=this.store.data.stats;return title('Progression locale')+`<dl class="score-breakdown">${[['Traversées réussies',s.completed],['Tentatives interrompues',s.failed],['Passagers transportés',s.passengers],['Meilleure note',`${s.best} / 100`],['Temps en mission',clock(s.seconds)],['Temps en navigation libre',clock(s.freeSeconds)],['Distance en mode libre',`${(s.freeDistance/1852).toFixed(2)} milles`]].map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><h3>Dernières traversées</h3>${this.store.data.history.length?`<ul class="game-history">${this.store.data.history.slice(0,8).map(r=>`<li><span>${escape(MISSIONS.find(m=>m.id===r.missionId)?.title??r.missionId)}<br><small>${escape(r.grade)} · ${clock(r.elapsed)}</small></span><strong>${r.score} / 100</strong></li>`).join('')}</ul>`:'<p>Aucune traversée terminée. Votre première mission vous attend.</p>'}<p>Sauvegarde IndexedDB sur ce navigateur, sans compte.</p>`;
    }
    const canResume=(this.started&&!this.mission?.finished)||this.store.data.active;
    return title(this.started?'Traversée en pause':'À vous la barre')+`<p>La baie de Saint-Malo et Dinard à bord du Corsaire d’Émeraude.</p><nav class="game-main-nav" aria-label="Modes de jeu">${canResume?'<button class="game-primary" data-action="resume">Reprendre la partie</button>':''}${this.started&&this.mode==='free'&&this.store.data.active?'<button data-action="resume-saved">Reprendre la mission sauvegardée</button>':''}<button data-action="free">Navigation libre <span>Choisir la météo et explorer la baie</span></button><button data-action="missions">Missions <span>Saint-Malo → Dinard · 180 passagers</span></button><button data-action="settings">Paramètres</button><button data-action="progress">Progression et statistiques locales</button><button data-action="excursions">Excursion et son</button></nav>${this.started&&this.mode==='mission'&&!this.mission?.finished?'<div class="game-buttons"><button data-action="restart">Redémarrer la mission</button><button data-action="checkpoint">Reprendre au point sûr</button></div>':''}<p class="game-storage" role="status"></p><small>Données maritimes fictives · ne pas utiliser pour la navigation réelle.</small>`;
  }
  private weatherChoices():string {
    const m=this.store.data.marine;
    return `<div class="free-choices"><label for="free-sea">État de mer<select id="free-sea">${Object.keys(SEA).map(k=>`<option value="${k}" ${k===m.sea?'selected':''}>${SEA_LABELS[k as keyof typeof SEA]}</option>`).join('')}</select></label><label for="free-hour">Heure<input id="free-hour" type="number" min="0" max="23" value="${Math.floor(m.hour)}"></label><label for="free-wind">Vent venant de (°)<input id="free-wind" type="number" min="0" max="359" value="${Math.round(m.targetDirection)}"></label><label class="check"><input id="free-damage" type="checkbox" ${m.damageEnabled?'checked':''}>Dégâts activés</label></div><p>Les réglages détaillés restent accessibles pendant la navigation.</p>`;
  }
  private routeMarkup(d:MissionDefinition):string {
    // Reuse the existing map's authored coast, route, hazards and ports, removing live IDs.
    const svg=document.querySelector('#bay-map svg')!.cloneNode(true) as SVGElement;
    svg.querySelector('.map-route')?.setAttribute('points',[d.origin.berth,...d.route,d.destination.berth].map(p=>`${p.x},${p.z}`).join(' '));
    svg.querySelector('#map-camera')?.remove();svg.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
    return `<figure class="briefing-map">${svg.outerHTML}<figcaption>${escape(d.origin.name)} → ${escape(d.destination.name)}<br>Trajet suggéré · données fictives</figcaption></figure>`;
  }
  private prepare(definition:MissionDefinition):void {
    this.store.data.active=null;
    this.mission=new Mission(definition);this.mode='mission';this.started=false;this.lastPhase=undefined;
    this.world.vessel.dynamics.reset(definition.origin.berth);this.world.vessel.marine.damage=0;this.world.vessel.moored=true;
    this.world.passengers.reset();this.immersion.reset();
    this.applyMarine({...this.store.data.marine,sea:definition.sea,hour:definition.departureHour,targetDirection:definition.windDirection,tidePhase:0,evolving:true,dayCycle:false,tideCycle:true});
    this.resetView();this.markers.setMission(definition);this.show('briefing');
  }
  private resetView():void {
    this.world.resetWaterEffects();
    Object.assign(this.world.vessel.visual,this.world.vessel.dynamics.state);this.world.setCameraMode('external');this.ui.setShipView();this.helm.refresh();
    this.previousFree=undefined;
  }
  private startFree():void {
    const get=(id:string)=>this.dialog.querySelector<HTMLInputElement>(`#${id}`)!;
    this.store.data.marine=readMarine({...this.store.data.marine,sea:get('free-sea').value,hour:Number(get('free-hour').value),targetDirection:Number(get('free-wind').value),damageEnabled:get('free-damage').checked});
    this.mode='free';this.mission=undefined;this.world.vessel.moored=false;this.world.vessel.dynamics.reset();this.world.vessel.marine.damage=0;
    this.world.passengers.reset();this.immersion.reset();
    document.querySelector('#app')!.classList.remove('mission-active');this.lockMissionSettings();
    this.applyMarine(this.store.data.marine);this.resetView();this.markers.setMission(null);this.launch();
  }
  private launch():void {
    this.started=true;this.returnSettings();this.dialog.close();this.world.vessel.moored=this.mode==='mission'&&!!this.mission?.moored;
    this.lockMissionSettings();this.setPaused(false);this.hud.hidden=this.mode!=='mission';this.refreshHud();this.snapshot();
  }
  private resume():void {
    if(!this.started){
      const saved=this.store.data.active,definition=MISSIONS.find(d=>d.id===saved?.missionId);
      if(!saved||!definition){this.show('home');return;}
      this.mission=new Mission(definition,saved.mission);this.mode='mission';
      this.world.vessel.dynamics.restore(saved.vessel,saved.command);this.applyMarine(readMarine(saved.marine));this.world.vessel.marine.damage=saved.damage;
      this.world.passengers.reset(saved.passengers);this.immersion.reset(saved.tourVisited);
      this.resetView();this.markers.setMission(definition);
    }
    if(this.mission?.finished){this.show('result');return;}this.launch();
  }
  private recover():void {
    if(!this.mission||this.mission.phase==='preparation'){this.show('home');return;}
    this.mission.recover();const def=this.mission.definition;
    this.world.vessel.dynamics.reset(this.mission.state.checkpoint==='approach'?def.destination.approach:def.origin.berth);
    this.world.vessel.marine.damage=Math.min(.3,this.world.vessel.marine.damage);this.resetView();this.launch();
    this.world.passengers.reset(this.world.passengers.snapshot());
  }
  private action():void {
    const m=this.mission;if(!m)return;
    if(m.phase==='departure')m.release();else if(m.phase==='docking')m.dock(this.telemetry());
    this.refreshHud();this.snapshot();
  }
  private telemetry():Telemetry {
    const v=this.world.vessel,s=v.dynamics.state,c=v.dynamics.command;
    return {...s,speed:Math.hypot(s.surge,s.sway),commandPort:c.port,commandStarboard:c.starboard,contact:v.contact.label,damage:v.marine.damage,clearance:v.marine.clearance};
  }
  update(dt:number):void {
    if(this.paused)return;
    const v=this.world.vessel;
    if(this.mode==='mission'&&this.mission)v.marine.hour=(this.mission.definition.departureHour+this.mission.state.elapsed/3600)%24;
    v.moored=this.mode==='mission'&&!!this.mission?.moored;
    this.helm.setEnabled(!v.moored);this.helm.update(dt);this.world.update(dt);
    if(this.mode==='mission'&&this.mission){
      if(this.world.passengers.count>0)this.mission.state.metrics.discomfort+=Math.max(0,v.marine.waves-.5)*dt*.025;
      this.mission.update(dt,this.telemetry());
      this.updatePassengers(dt);
      if(this.mission.finished){
        if(this.mission.result)recordResult(this.store.data,this.mission.result);
        this.show('result');return;
      }
      if(this.mission.phase!==this.lastPhase){this.lastPhase=this.mission.phase;this.snapshot();}
    }else{
      this.updatePassengers(dt);
      const s=v.dynamics.state;this.store.data.stats.freeSeconds+=dt;
      if(this.previousFree)this.store.data.stats.freeDistance+=Math.hypot(s.x-this.previousFree.x,s.z-this.previousFree.z);
      this.previousFree={x:s.x,z:s.z};
    }
    this.immersion.update(dt);
    this.autosave+=dt;if(this.autosave>=10){this.autosave=0;this.snapshot();}
  }
  render(dt:number):void {
    this.renderTimer+=dt;if(this.renderTimer<.2)return;this.renderTimer=0;
    if(!this.paused)this.ui.status.textContent=this.mode==='mission'&&this.mission?`${names[this.mission.phase]} · ${this.mission.definition.title}`:'Navigation libre · Deux moteurs';
    this.refreshHud();
    this.immersion.render();
  }
  private updatePassengers(dt:number):void {
    const m=this.mode==='mission'?this.mission:undefined,s=this.world.vessel.dynamics.state;
    this.world.passengers.update(dt,m?.phase??'free',m?.state.phaseTime??0,m?.definition.passengers??48,m?.definition.boardingSeconds??18,m?.definition.unloadingSeconds??12,Math.hypot(s.surge,s.sway),s.yawRate,this.world.vessel.marine.waves);
  }
  private target():{x:number;z:number;label:string}|undefined {
    const m=this.mission;if(!m)return;
    if(m.phase==='crossing'||m.phase==='departure'){
      const s=this.world.vessel.dynamics.state,d=m.definition;
      const arrivalDistance=Math.hypot(s.x-d.destination.berth.x,s.z-d.destination.berth.z);
      return d.route.find((p,i)=>!m.state.visited.includes(i)&&Math.hypot(p.x-d.destination.berth.x,p.z-d.destination.berth.z)<arrivalDistance-40)??{...d.destination.berth,label:d.destination.name};
    }
    return {...m.definition.destination.berth,label:m.definition.destination.name};
  }
  private refreshHud():void {
    const m=this.mission;if(!m)return;
    const set=(id:string,value:string)=>{this.hud.querySelector(`#${id}`)!.textContent=value;};
    set('objective-phase',names[m.phase]);set('objective-time',`${clock(m.state.elapsed)} / cible ${clock(m.definition.targetSeconds)}`);set('objective-comment',m.definition.comments[m.phase]);
    const t=this.telemetry(),target=this.target();this.markers.update(this.world.vessel.marine.tide,target);
    let guidance=target?`${target.label} · ${Math.round(Math.hypot(t.x-target.x,t.z-target.z))} m · cap conseillé ${Math.round(degrees(Math.atan2(target.x-t.x,-(target.z-t.z))))%360}°`:'';
    if(m.phase==='boarding')guidance=`${Math.min(m.definition.passengers,Math.floor(m.definition.passengers*m.state.phaseTime/m.definition.boardingSeconds))} / ${m.definition.passengers} passagers à bord`;
    if(m.phase==='unloading')guidance=`${Math.min(m.definition.passengers,Math.floor(m.definition.passengers*m.state.phaseTime/m.definition.unloadingSeconds))} / ${m.definition.passengers} passagers débarqués`;
    if(m.phase==='docking'){
      const d=dockingStatus(m.definition,t),limit=m.definition.docking;guidance=`Zone : ${d.distance.toFixed(0)} / ${limit.distance} m · écart de cap ${d.angle.toFixed(0)} / ${limit.angleDegrees}° · ${d.speedKnots.toFixed(1)} / ${limit.speedKnots.toLocaleString('fr-FR')} nd · ${d.neutral?'Neutre':'Mettez au neutre'} · stabilité ${Math.min(limit.holdSeconds,m.state.hold).toFixed(1)} / ${limit.holdSeconds} s`;
    }
    set('objective-guidance',guidance);
    const button=this.hud.querySelector<HTMLButtonElement>('#mission-action')!;
    button.hidden=!(m.phase==='departure'&&!m.state.released||m.phase==='docking');
    button.textContent=m.phase==='departure'?'Larguer les amarres':'Amarrer et débarquer';
    button.disabled=m.phase==='docking'&&(m.state.hold<m.definition.docking.holdSeconds||!dockingStatus(m.definition,t).valid);
    const stages:MissionPhase[]=['boarding','departure','crossing','approach','docking','unloading'];
    this.hud.querySelector('#objective-steps')!.innerHTML=stages.map((p,i)=>`<li ${p===m.phase?'aria-current="step"':''}>${i<stages.indexOf(m.phase)?'✓ ':''}${names[p]}</li>`).join('');
    document.querySelector('#app')!.classList.toggle('mission-active',this.mode==='mission'&&!m.finished);
  }
  private lockMissionSettings():void {
    const locked=this.mode==='mission'&&!!this.mission&&!this.mission.finished;
    this.settingsPanel.querySelectorAll<HTMLInputElement|HTMLButtonElement>('#sea-state,#wind-direction,#marine-hour,#tide-phase,[data-marine]:not([data-marine="sound"]),#repair-hull').forEach(el=>{el.disabled=locked;});
  }
  private snapshot():void {
    const m=this.mission,v=this.world.vessel;
    this.store.data.instruments=this.marinePanel.captureLayout();
    if(this.mode==='mission'&&m&&m.phase!=='preparation'&&!m.finished){
      this.store.data.active={missionId:m.definition.id,mission:structuredClone(m.state),vessel:{...v.dynamics.state},command:{...v.dynamics.command},marine:readMarine(v.marine),damage:v.marine.damage,passengers:this.world.passengers.snapshot(),tourVisited:[...this.immersion.guide.visited]};
    }else if(this.mode==='mission'&&m?.finished)this.store.data.active=null;
    void this.store.save().then(()=>this.storageStatus());
  }
  private storageStatus():void {
    const status=this.dialog.querySelector('.game-storage');if(status)status.textContent=this.store.available?'Sauvegarde locale automatique · aucun compte requis':'Stockage indisponible : progression conservée pour cette session uniquement.';
    if(!this.store.available)this.ui.storageWarning();
  }
  dispose():void {this.snapshot();this.abort.abort();this.returnSettings();this.immersion.dispose();this.dialog.remove();this.hud.remove();this.menuButton.remove();this.markers.dispose();this.store.close();}
}
