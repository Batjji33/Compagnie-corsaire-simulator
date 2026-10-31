import { SHIPS, isShipId } from '../ships/parameters';
import { vesselMission } from '../missions/vesselMission';
import { COAST_DESTINATIONS } from '../world/EmeraldCoast';
import { ROUTE } from '../world/geography';
import type { World } from '../world/World';
import type { HelmControls } from './HelmControls';
import type { Interface } from './Interface';
import type { MarinePanel } from './MarinePanel';
import { Mission, dockingStatus } from '../missions/Mission';
import { dockingRules } from '../missions/docking';
import type { Telemetry } from '../missions/Mission';
import { MISSIONS, MALO_DINARD } from '../missions/definitions';
import type { MissionDefinition, MissionPhase } from '../missions/definitions';
import { GameStore, readMarine, recordResult, recordServiceResult } from '../saves/GameStore';
import { FerryService, servicePassengers } from '../missions/FerryService';
import { SEA, SEA_LABELS, degrees } from '../weather/Marine';
import { MissionMarkers } from '../world/MissionMarkers';
import { Immersion } from './Immersion';
import { icon } from './icons';
import { formatHour } from '../core/time';
import type { PortId } from '../traffic/Berths';
import { TIME_RATES } from '../core/TimeAcceleration';
import type { TimeAcceleration } from '../core/TimeAcceleration';
import { accelerationDanger } from '../core/navigationSafety';

const names:Record<MissionPhase,string>={preparation:'Préparation',boarding:'Embarquement',departure:'Départ',crossing:'Traversée',approach:'Approche',docking:'Accostage',unloading:'Débarquement',complete:'Bilan',failed:'Mission interrompue'};
const clock=(seconds:number)=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
const hourLabel=formatHour;
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export class Game {
  mission:Mission|undefined;
  private service:FerryService|undefined;
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
  private timeButton=document.createElement('button');
  private timeNotice=document.createElement('p');
  private noticeRemaining=0;
  private safetyTimer=0;
  constructor(private world:World,private helm:HelmControls,private ui:Interface,private marinePanel:MarinePanel,private store:GameStore,private pauseLoop:(paused:boolean)=>void,private acceleration:TimeAcceleration){
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
    this.hud.innerHTML='<div class="objective-top"><strong id="objective-phase"></strong><span class="objective-summary"><span id="objective-time"></span><span id="objective-clock" aria-label="Heure de bord"></span></span></div><p id="objective-guidance"></p><div class="objective-actions"><button id="mission-action"></button><button id="mission-skip" hidden>Passer l’attente</button><button id="mission-details" aria-expanded="false" aria-controls="objective-details">Journal de bord</button></div><div id="objective-details" hidden><p id="objective-count" hidden></p><p id="objective-schedule" hidden></p><p id="objective-comment"></p><ol id="objective-steps"></ol><button id="service-end" hidden>Terminer le service</button></div>';
    document.querySelector('.voyage-overlays')!.append(this.hud);
    this.timeButton.id='mission-time-rate';this.timeButton.type='button';
    this.timeButton.setAttribute('aria-live','polite');
    this.hud.querySelector('.objective-actions')!.append(this.timeButton);
    this.timeNotice.id='mission-time-notice';this.timeNotice.hidden=true;this.timeNotice.setAttribute('role','status');
    this.hud.append(this.timeNotice);this.syncTimeButton();
    this.timeButton.addEventListener('click',()=>{
      if(this.paused)return;
      const next=TIME_RATES[(TIME_RATES.indexOf(this.acceleration.multiplier)+1)%TIME_RATES.length];
      const danger=next===1?undefined:this.timeDanger();
      if(!this.acceleration.select(next,danger))this.showTimeNotice(danger!);
      else {this.timeNotice.hidden=true;this.noticeRemaining=0;}
      this.safetyTimer=0;this.syncTimeButton();
    },options);
    this.hud.querySelector('#mission-action')!.addEventListener('click',()=>this.action(),options);
    this.hud.querySelector('#mission-skip')!.addEventListener('click',()=>this.skipWait(),options);
    this.hud.querySelector('#service-end')!.addEventListener('click',()=>this.show('end-service'),options);
    this.hud.querySelector('#mission-details')!.addEventListener('click',()=>{const details=this.hud.querySelector<HTMLElement>('#objective-details')!;details.hidden=!details.hidden;this.hud.querySelector('#mission-details')!.setAttribute('aria-expanded',String(!details.hidden));},options);
    this.hud.addEventListener('keydown',e=>{if(e.key==='Escape'){this.hud.querySelector<HTMLElement>('#objective-details')!.hidden=true;this.hud.querySelector('#mission-details')!.setAttribute('aria-expanded','false');}},options);
    this.dialog.addEventListener('click',e=>{
      const button=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');if(!button)return;
      const action=button.dataset.action!;
      if(action==='resume')this.resume();else if(action==='resume-saved'){this.started=false;this.resume();}else if(action==='start-free')this.startFree();else if(action==='start-mission')this.prepare(MISSIONS.find(d=>d.id===button.dataset.mission)??MALO_DINARD);
      else if(action==='board'){this.mission?.board();this.launch();if(this.service)this.immersion.announce(`Embarquement pour ${this.service.destinationName}.`);}
      else if(action==='confirm-end-service')this.finishService();
      else if(action==='restart'){this.prepare(this.mission?.definition??MALO_DINARD);}
      else if(action==='checkpoint')this.recover();else this.show(action);
    },options);
    this.dialog.addEventListener('cancel',e=>{e.preventDefault();if(this.started&&!this.mission?.finished)this.resume();},options);
    this.dialog.addEventListener('keydown',e=>{e.stopPropagation();},options);
    this.dialog.addEventListener('change',e=>{
      const select=e.target as HTMLSelectElement;
      if(select.id==='ship-select'&&isShipId(select.value)){this.store.data.selectedShip=select.value;this.show(select.dataset.screen??'free');return;}
      if(select.id!=='mission-sea')return;
      const sea=this.settingsPanel.querySelector<HTMLSelectElement>('#sea-state')!;
      sea.value=select.value;sea.dispatchEvent(new Event('change',{bubbles:true}));
      const summary=this.dialog.querySelector('#mission-weather-summary');if(summary)summary.textContent=this.missionWeather();
    },options);
    // Reuse the existing settings controls inside the modal, including their handlers.
    this.dialog.addEventListener('click',e=>{if((e.target as HTMLElement).closest('#settings-close')){e.preventDefault();e.stopImmediatePropagation();this.show('home');}}, {...options,capture:true});
    const savePreferences=()=>{
      if(!this.mission||this.mode==='free')this.store.data.marine=readMarine(this.world.vessel.marine);
      this.store.data.marine.sea=this.world.vessel.marine.sea;
      this.store.data.marine.sound=this.world.vessel.marine.sound;
      this.snapshot();
    };
    this.settingsPanel.addEventListener('change',savePreferences,options);
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.started&&!this.paused){this.show('home');}},options);
    window.addEventListener('pagehide',()=>this.snapshot(),options);
    this.immersion=new Immersion(world,store,()=>this.show('excursions'));
    this.settingsPanel.addEventListener('hull-repaired',()=>{this.immersion.audio.repair(this.world.vessel.marine.sound);this.snapshot();},options);
    this.world.scene.add(this.markers.root);
    this.world.selectShip(this.store.data.selectedShip);this.helm.refresh();
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
    if(value){this.acceleration.reset();this.syncTimeButton();}
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
    if(screen==='progress')this.dialog.querySelector('#menu-content')!.insertAdjacentHTML('beforeend',this.serviceHistory());
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
    const serviceScreen=this.serviceMarkup(screen);if(serviceScreen)return serviceScreen;
    if(screen==='excursions')return title('Excursion et ambiance')+'<p>Choisissez les commentaires, préparez votre excursion et réglez les volumes. La navigation est en pause pendant la préparation.</p>';
    if(screen==='settings')return title('Paramètres')+'<p>Les réglages sont sauvegardés sur cet appareil. L’état de la mer peut être modifié avant le départ et pendant toutes les missions.</p>';
    if(screen==='free')return title('Navigation libre')+`<p>Explorez Saint-Malo, Dinard, Cézembre, Fort La Latte et le Cap Fréhel. Les caps sont des points d’observation en mer.</p>${this.shipChoices('free')}${this.weatherChoices()}<label for="free-start">Point de départ<select id="free-start">${COAST_DESTINATIONS.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}</select></label><button class="game-primary" data-action="start-free">Prendre la barre</button>`;
    if(screen==='missions')return title('Missions')+`<p>Choisissez votre ligne et prenez la barre.</p>${this.shipChoices('missions')}${MISSIONS.map(authored=>{const m=vesselMission(authored,SHIPS[this.store.data.selectedShip].parameters);return `<article class="mission-choice"><h3>${m.id===MALO_DINARD.id?'Saint-Malo ↔ Dinard':escape(m.title)}</h3><p>${m.id===MALO_DINARD.id?'Service continu : allers-retours illimités, passagers renouvelés à chaque escale.':escape(m.description)}</p><p>${m.id===MALO_DINARD.id?'6 min par traversée · 2 min d’escale':`Environ ${Math.round(m.targetSeconds/60)} min de jeu`} · ${m.cruiseKnots} nd conseillés${m.excursion?` · ${m.route.length} étapes`: ""}</p>${m.excursion?.adaptation?`<p>${escape(m.excursion.adaptation)}</p>`:''}<button data-action="start-mission" data-mission="${m.id}">${m.id===MALO_DINARD.id?'Préparer le service':'Préparer l’excursion'}</button></article>`;}).join('')}`;
    if(screen==='briefing')return title(escape(d.title))+`<p>${escape(d.description)}</p>${this.missionSeaMarkup()}<div class="briefing-layout">${this.routeMarkup(d)}<div><h3>Feuille de traversée</h3><dl class="game-facts"><div><dt>Départ</dt><dd>${hourLabel(d.departureHour)} · ${escape(d.origin.name)}</dd></div><div><dt>Arrivée cible</dt><dd>${hourLabel(d.departureHour+d.targetSeconds/3600)} · ${escape(d.destination.name)}</dd></div><div><dt>Conditions</dt><dd id="mission-weather-summary">${this.missionWeather()}</dd></div><div><dt>Durée de jeu</dt><dd>Cible ${clock(d.targetSeconds)} · temps physique normal</dd></div></dl></div></div>${this.itineraryMarkup(d)}<p>Amarres en place. Chargez les ${d.passengers} passagers, puis larguez les amarres. À l’arrivée, rejoignez la zone ocre de ${dockingRules(d).distance} m de rayon à moins de ${dockingRules(d).speedKnots.toLocaleString('fr-FR')} nd, puis appuyez sur « Amarrer et débarquer ». Aucun cap ni délai de stabilité n’est imposé. Les boudins protègent les appuis latéraux au quai ; les chocs par l’avant ou l’arrière restent des contacts.</p><p>La note dépend de la ponctualité, de la sécurité, du confort et des manœuvres. Les reprises au point sûr restent possibles avec une pénalité de manœuvre.</p><button class="game-primary" data-action="board">Embarquer les passagers</button>`;
    if(screen==='result'&&this.mission?.result){const r=this.mission.result;return title(r.completed?'Bienvenue à '+escape(d.destination.name.split(' · ')[0]):'Mission interrompue')+`<p>${escape(r.reason)}</p><div class="mission-score"><strong>${r.score}<small> / 100</small></strong><span>${escape(r.grade)}</span></div><dl class="score-breakdown">${[['Ponctualité',r.punctuality],['Sécurité',r.safety],['Confort',r.comfort],['Manœuvres',r.manoeuvres]].map(([label,value])=>`<div><dt>${label}</dt><dd>${value} / 100</dd></div>`).join('')}</dl><p>${r.passengers} passagers arrivés · ${clock(r.elapsed)} · ${r.metrics.contacts} contacts · ${r.metrics.recoveries} reprises</p><div class="game-buttons"><button data-action="restart">Recommencer</button>${!r.completed?'<button data-action="checkpoint">Reprendre au point sûr</button>':''}<button data-action="progress">Voir la progression</button></div>`;}
    if(screen==='progress'){
      const s=this.store.data.stats;return title('Progression locale')+`<dl class="score-breakdown">${[['Traversées réussies',s.completed],['Tentatives interrompues',s.failed],['Passagers transportés',s.passengers],['Meilleure note',`${s.best} / 100`],['Temps en mission',clock(s.seconds)],['Temps en navigation libre',clock(s.freeSeconds)],['Distance en mode libre',`${(s.freeDistance/1852).toFixed(2)} milles`]].map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><h3>Dernières traversées</h3>${this.store.data.history.length?`<ul class="game-history">${this.store.data.history.slice(0,8).map(r=>`<li><span>${escape(typeof r.routeTitle==='string'?r.routeTitle:MISSIONS.find(m=>m.id===r.missionId)?.title??r.missionId)}<br><small>${escape(r.grade)} · ${clock(r.elapsed)}</small></span><strong>${r.score} / 100</strong></li>`).join('')}</ul>`:'<p>Aucune traversée terminée. Votre première mission vous attend.</p>'}<p>Sauvegarde IndexedDB sur ce navigateur, sans compte.</p>`;
    }
    const canResume=(this.started&&!this.mission?.finished)||this.store.data.active;
    return title(this.started?'Traversée en pause':'À vous la barre')+`<p>La baie de Saint-Malo et Dinard à bord du ${SHIPS[this.world.vessel.shipId].name}.</p><nav class="game-main-nav" aria-label="Modes de jeu">${canResume?'<button class="game-primary" data-action="resume">Reprendre la partie</button>':''}${this.started&&this.mode==='free'&&this.store.data.active?'<button data-action="resume-saved">Reprendre la mission sauvegardée</button>':''}<button data-action="free">Navigation libre <span>Choisir la météo et explorer la baie</span></button><button data-action="missions">Missions et excursions <span>Saint-Malo ↔ Dinard · Cézembre · Fort La Latte · Cap Fréhel</span></button><button data-action="settings">Paramètres</button><button data-action="progress">Progression et statistiques locales</button><button data-action="excursions">Excursion et son</button></nav>${this.started&&this.mode==='mission'&&!this.mission?.finished?'<div class="game-buttons"><button data-action="restart">Redémarrer la mission</button><button data-action="checkpoint">Reprendre au point sûr</button></div>':''}<p class="game-storage" role="status"></p><small>Données maritimes fictives · ne pas utiliser pour la navigation réelle.</small>`;
  }
  private shipChoices(screen:string):string {
    const id=this.store.data.selectedShip,ship=SHIPS[id],p=ship.parameters;
    return `<label for="ship-select">Navire<select id="ship-select" data-screen="${screen}">${Object.entries(SHIPS).map(([key,s])=>`<option value="${key}" ${key===id?'selected':''}>${s.name}</option>`).join('')}</select></label><p class="ship-facts">${ship.type} · ${p.length.toLocaleString('fr-FR')} × ${p.beam.toLocaleString('fr-FR')} m · ${p.passengers} passagers · ${p.maxSpeedKnots.toLocaleString('fr-FR')} nd${id==='saint-malo'?' · Tirant d’eau 1,65 m · Salon avec tables et pont supérieur découvert':''}</p>`;
  }
  private weatherChoices():string {
    const m=this.store.data.marine;
    return `<div class="free-choices"><label for="free-sea">État de mer<select id="free-sea">${Object.keys(SEA).map(k=>`<option value="${k}" ${k===m.sea?'selected':''}>${SEA_LABELS[k as keyof typeof SEA]}</option>`).join('')}</select></label><label for="free-hour">Heure<input id="free-hour" type="number" min="0" max="23" value="${Math.floor(m.hour)}"></label><label for="free-wind">Vent venant de (°)<input id="free-wind" type="number" min="0" max="359" value="${Math.round(m.targetDirection)}"></label><label class="check"><input id="free-damage" type="checkbox" ${m.damageEnabled?'checked':''}>Dégâts activés</label></div><p>Les réglages détaillés restent accessibles pendant la navigation.</p>`;
  }
  private missionWeather():string {
    const m=this.world.vessel.marine,sea=SEA[m.sea];
    return `${SEA_LABELS[m.sea]} · vent visé ${sea[0]} nd de ${Math.round(m.targetDirection)}° · vagues visées ${sea[1].toLocaleString('fr-FR')} m`;
  }
  private missionSeaMarkup():string {
    const sea=this.world.vessel.marine.sea;
    return `<label for="mission-sea">État de la mer au départ</label><select id="mission-sea">${(Object.keys(SEA) as (keyof typeof SEA)[]).map(key=>`<option value="${key}" ${key===sea?'selected':''}>${SEA_LABELS[key]}</option>`).join('')}</select><p>Vous pouvez aussi changer la mer pendant la mission dans Réglages → Mer et navigation. Les vagues, le vent et la visibilité évoluent progressivement vers le nouvel état.</p>`;
  }
  private itineraryMarkup(d:MissionDefinition):string {
    if(!d.excursion)return '';
    return `<p>${escape(d.excursion.reference)}. <a href="${d.excursion.source}" target="_blank" rel="noopener">Voir le circuit de la compagnie</a>.</p>${d.excursion.adaptation?`<p>${escape(d.excursion.adaptation)}</p>`:''}<p>Distances et durées adaptées au jeu. Validez chaque point de passage dans l’ordre. Le cercle vert indique la prochaine étape ; aux panoramas, restez à moins de 5 nd pendant le temps indiqué.</p><ol class="excursion-itinerary">${d.route.map(p=>`<li>${escape(p.label)}${p.dwellSeconds?` · panorama ${p.dwellSeconds} s à moins de ${p.maxKnots} nd`:''}</li>`).join('')}</ol>`;
  }
  private serviceMarkup(screen:string):string|undefined {
    const service=this.service;if(!service)return;
    const title=(text:string)=>`<h2 id="game-menu-title" tabindex="-1">${text}</h2>`;
    const s=service.state,d=service.mission.definition;
    if(screen==='briefing')return title('Service Saint-Malo ↔ Dinard')+`
      <p>Assurez autant d’allers-retours que vous le souhaitez. À chaque arrivée, les passagers débarquent puis de nouveaux voyageurs embarquent. Vous décidez quand repartir et quand terminer votre service.</p>
      ${this.missionSeaMarkup()}<div class="briefing-layout">${this.routeMarkup(d)}<dl class="game-facts"><div><dt>Premier départ</dt><dd>Saint-Malo → Dinard · ${d.passengers} voyageurs</dd></div><div><dt>Capacité</dt><dd>${this.world.vessel.parameters.passengers} passagers maximum · fréquentation variable</dd></div><div><dt>Escale</dt><dd>2 min après l’arrivée prévue ou réelle si elle est plus tardive, puis départ à votre rythme</dd></div><div><dt>Navigation</dt><dd>Créneaux de ${clock(service.crossingSeconds)} min · ${d.cruiseKnots} nd conseillés · trajectoire libre</dd></div></dl></div>
      <p>L’horloge de bord avance avec le jeu. Le compteur alterne 6 min de traversée et 2 min d’escale, même en attente de cale, sans changer votre destination. Une arrivée anticipée conserve le temps restant avant l’escale ; une arrivée tardive impose 2 min à quai. Après les transferts, « Passer l’attente » avance l’heure au prochain départ autorisé.</p>
      <p>Amarrez dans le cercle ocre de ${dockingRules(d).distance} m, à moins de ${dockingRules(d).speedKnots} nd. Les appuis latéraux au quai restent protégés par les boudins. Le service continue malgré les retards ou incidents ; leurs conséquences restent actives sur le navire et la satisfaction.</p>
      <p>« Terminer le service » se trouve dans le journal de bord et le menu de pause. Votre service est sauvegardé automatiquement sur cet appareil.</p><button class="game-primary" data-action="board">Embarquer les passagers</button>`;
    if(screen==='end-service'&&!service.result)return title('Terminer le service ?')+`
      <p>${s.completed} traversée${s.completed>1?'s':''} réalisée${s.completed>1?'s':''} · ${s.transported} passagers transportés · ${clock(s.elapsed)} de service.</p>
      <p>Le bilan compte les traversées dont le débarquement est terminé. Les passagers encore à bord ne seront pas ajoutés aux passagers transportés.</p>
      <div class="game-buttons"><button class="game-primary" data-action="resume">Continuer le service</button><button data-action="confirm-end-service">Confirmer la fin du service</button></div>`;
    if((screen==='service-result'||screen==='result')&&service.result){
      const r=service.result,percent=(v:number|null)=>v===null?'—':`${Math.round(v)} %`;
      return title('Bilan du service')+`<p>Service Saint-Malo ↔ Dinard terminé à votre demande · durée totale ${clock(r.elapsed)}.</p><dl class="score-breakdown">${[['Traversées réalisées',r.completed],['Passagers transportés',r.transported],['Satisfaction moyenne',percent(r.satisfaction)],['Qualité des accostages',r.dockingQuality===null?'—':`${Math.round(r.dockingQuality)} / 100`]].map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><p>La satisfaction est pondérée par les passagers débarqués. La qualité des accostages tient compte de la vitesse à l’amarrage et des contacts pendant l’approche.</p><div class="game-buttons"><button data-action="restart">Nouveau service</button><button data-action="progress">Progression</button><button data-action="home">Menu</button></div>`;
    }
    if(screen==='home'&&this.started&&!service.result)return title('Service en pause')+`<p>Destination : ${service.destinationName} · ${s.completed} traversée${s.completed>1?'s':''} · ${s.transported} passagers transportés · durée ${clock(s.elapsed)}.</p><nav class="game-main-nav" aria-label="Service"><button class="game-primary" data-action="resume">Reprendre le service</button><button data-action="end-service">Terminer le service</button><button data-action="settings">Paramètres</button><button data-action="excursions">Excursion et son</button><button data-action="progress">Progression</button></nav><p class="game-storage" role="status"></p>`;
  }
  private serviceHistory():string {
    if(!this.store.data.services.length)return '';
    return `<h3>Derniers services</h3><ul class="game-history">${this.store.data.services.slice(0,8).map(r=>`<li><span>Saint-Malo ↔ Dinard<br><small>${r.completed} traversées · ${r.transported} passagers · ${clock(r.elapsed)}</small></span><strong>${r.satisfaction===null?'—':Math.round(r.satisfaction)+' %'}</strong></li>`).join('')}</ul>`;
  }
  private finishService():void {
    if(!this.service||this.service.result)return;
    const result=this.service.finish(this.world.passengers.satisfaction);
    if(this.service.mission.result)recordResult(this.store.data,this.service.mission.result);
    recordServiceResult(this.store.data,result);
    this.world.vessel.dynamics.setCommand({port:0,starboard:0,rudder:0});this.world.vessel.moored=true;
    this.hud.hidden=true;this.show('service-result');
  }
  private setMissionRoute():void {
    const d=this.mission?.definition;this.markers.setMission(d??null);
    const line=document.querySelector('#bay-chart .map-route');
    if(line)line.setAttribute('points',d?[d.origin.berth,...d.route,d.destination.berth].map(p=>`${p.x},${p.z}`).join(' '):ROUTE.map(p=>p.join(',')).join(' '));
    document.querySelectorAll('#bay-chart .map-route').forEach((el,i)=>{el.classList.toggle('map-route-muted',!!d&&i>0);});
  }
  private routeMarkup(d:MissionDefinition):string {
    // Reuse the existing map's authored coast, route, hazards and ports, removing live IDs.
    const svg=document.querySelector('#bay-chart')!.cloneNode(true) as SVGElement;
    svg.removeAttribute('id');
    svg.querySelectorAll('.map-route').forEach((el,i)=>{if(i>0)el.remove();});
    svg.querySelector('.map-route')?.setAttribute('points',[d.origin.berth,...d.route,d.destination.berth].map(p=>`${p.x},${p.z}`).join(' '));
    const points=[d.origin.berth,...d.route,d.destination.berth],xs=points.map(p=>p.x),zs=points.map(p=>p.z);
    const minX=Math.min(...xs)-650,minZ=Math.min(...zs)-650;
    svg.setAttribute('viewBox',`${minX} ${minZ} ${Math.max(...xs)-minX+650} ${Math.max(...zs)-minZ+650}`);
    svg.querySelectorAll('text').forEach(el=>el.remove());
    svg.querySelectorAll('#map-camera,#map-vessel,#map-taxis').forEach(el=>el.remove());svg.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
    return `<figure class="briefing-map">${svg.outerHTML}<figcaption>${escape(d.origin.name)} → ${escape(d.destination.name)}<br>${d.excursion?'Étapes obligatoires dans l’ordre':'Trajet suggéré'} · données fictives</figcaption></figure>`;
  }
  private prepare(definition:MissionDefinition):void {
    if(this.service&&!this.service.result&&this.started){this.show('end-service');return;}
    if(definition.id===MALO_DINARD.id)definition=MALO_DINARD;
    this.world.selectShip(this.store.data.selectedShip);
    definition=vesselMission(definition,this.world.vessel.parameters);
    this.store.data.active=null;
    this.world.traffic.reset();
    this.service=definition.id===MALO_DINARD.id?new FerryService(undefined,undefined,this.world.vessel.parameters):undefined;
    this.mission=this.service?.mission??new Mission(definition);this.mode='mission';this.started=false;this.lastPhase=undefined;
    this.world.vessel.dynamics.reset(definition.origin.berth);this.world.vessel.marine.damage=0;this.world.vessel.moored=true;
    this.world.passengers.reset();this.immersion.reset();this.immersion.guide.destination=this.service?.destinationPort;
    this.applyMarine({...this.store.data.marine,hour:definition.departureHour,targetDirection:definition.windDirection,tidePhase:0,evolving:true,dayCycle:false,tideCycle:true});
    this.resetView();this.setMissionRoute();this.updatePassengers(0);this.show('briefing');
  }
  private resetView():void {
    this.acceleration.reset();this.safetyTimer=0;this.noticeRemaining=0;this.timeNotice.hidden=true;this.syncTimeButton();
    this.world.resetWaterEffects();
    Object.assign(this.world.vessel.visual,this.world.vessel.dynamics.state);this.world.setCameraMode('external');this.ui.setShipView();this.helm.refresh();
    this.previousFree=undefined;
  }
  private startFree():void {
    if(this.service&&!this.service.result&&this.started){this.show('end-service');return;}
    this.world.selectShip(this.store.data.selectedShip);
    const get=(id:string)=>this.dialog.querySelector<HTMLInputElement>(`#${id}`)!;
    this.store.data.marine=readMarine({...this.store.data.marine,sea:get('free-sea').value,hour:Number(get('free-hour').value),targetDirection:Number(get('free-wind').value),damageEnabled:get('free-damage').checked});
    const start=COAST_DESTINATIONS.find(d=>d.id===get('free-start').value)??COAST_DESTINATIONS[0];
    this.mode='free';this.service=undefined;this.mission=undefined;this.world.traffic.reset();this.world.vessel.moored=false;this.world.vessel.dynamics.reset(start);this.world.vessel.marine.damage=0;
    this.world.passengers.reset();this.immersion.reset();this.immersion.guide.destination=undefined;
    document.querySelector('#app')!.classList.remove('mission-active');this.lockMissionSettings();
    this.applyMarine(this.store.data.marine);this.resetView();this.setMissionRoute();this.launch();
  }
  private launch():void {
    this.syncMissionClock();
    this.started=true;this.returnSettings();this.dialog.close();this.world.vessel.moored=this.mode==='mission'&&!!this.mission?.moored;
    this.lockMissionSettings();this.setPaused(false);this.updatePassengers(0);this.hud.hidden=this.mode!=='mission';this.refreshHud();this.snapshot();
  }
  private resume():void {
    if(!this.started){
      const saved=this.store.data.active,definition=MISSIONS.find(d=>d.id===saved?.missionId);
      if(!saved||!definition){this.show('home');return;}
      this.world.selectShip(saved.shipId??'emeraude');this.store.data.selectedShip=this.world.vessel.shipId;
      this.service=definition.id===MALO_DINARD.id?new FerryService(saved.service,saved.mission,this.world.vessel.parameters):undefined;
      this.mission=this.service?.mission??new Mission(vesselMission(definition,this.world.vessel.parameters),saved.mission);this.mode='mission';
      this.world.vessel.dynamics.restore(saved.vessel,saved.command);this.applyMarine(readMarine(saved.marine));this.world.vessel.marine.damage=saved.damage;
      this.world.passengers.reset(saved.passengers);this.immersion.reset(saved.tourVisited);this.immersion.guide.destination=this.service?.destinationPort;
      this.resetView();this.setMissionRoute();
    }
    if(this.mission?.finished){this.show(this.service?.result?'service-result':'result');return;}this.launch();
  }
  private recover():void {
    if(!this.mission||this.mission.phase==='preparation'){this.show('home');return;}
    if(this.service){if(!this.service.recover()){this.launch();return;}}else this.mission.recover();const def=this.mission.definition;
    let pose=this.mission.state.checkpoint==='approach'?def.destination.approach:def.origin.berth;
    if(def.excursion&&this.mission.state.checkpoint==='departure'&&this.mission.state.visited.length){
      const index=Math.max(...this.mission.state.visited),last=def.route[index],next=def.route[index+1]??def.destination.berth;
      pose={...last,heading:Math.atan2(next.x-last.x,last.z-next.z)};
    }
    this.world.vessel.dynamics.reset(pose);
    this.world.vessel.marine.damage=Math.min(.3,this.world.vessel.marine.damage);this.resetView();this.launch();
    this.world.passengers.reset(this.world.passengers.snapshot());
  }
  private action():void {
    const m=this.mission;if(!m)return;
    if(m.phase==='departure'){
      if(this.service){if(this.service.release())this.immersion.announce(`Départ pour ${this.service.destinationName}. Bonne traversée.`);}
      else m.release();
    }
    else if(m.phase==='docking'){
      const port=this.arrivalPort();
      if(port&&!this.world.traffic.canPlayerDock(port)){this.refreshHud();return;}
      const docked=this.service?this.service.dock(this.telemetry(),this.world.passengers.satisfaction):m.dock(this.telemetry());
      if(docked&&this.service)this.immersion.announce(`Accostage réussi à ${this.service.destinationName}. Débarquement des passagers.`);
    }
    this.refreshHud();this.snapshot();
  }
  private syncMissionClock():void {
    if(this.mode==='mission'&&this.mission)this.world.vessel.marine.hour=this.service?.hour??(this.mission.definition.departureHour+this.mission.state.elapsed/3600)%24;
  }
  private skipWait():void {
    if(this.paused||!this.service||!this.world.vessel.moored)return;
    const skipped=this.service.skipWait(this.telemetry(),this.world.passengers.satisfaction);
    if(!skipped)return;
    this.syncServiceMission(skipped.arrival);
    // Advance only the autonomous traffic during the player's moored time jump.
    let remaining=skipped.seconds;
    const v=this.world.vessel;
    while(remaining>1e-8){const dt=Math.min(1/30,remaining);this.world.traffic.update(dt,v.dynamics.state,v.marine.hour,v.marine.waves,v.marine.visibility);remaining-=dt;}
    this.world.vessel.marine.update(skipped.seconds);this.syncMissionClock();
    this.world.vessel.marine.hazards(this.world.vessel.dynamics.state,'',0,0);
    this.updatePassengers(0);this.refreshHud();this.snapshot();
  }
  private syncServiceMission(arrival:ReturnType<FerryService['update']>):void {
    if(!this.service)return;
    if(arrival)recordResult(this.store.data,arrival);
    if(this.mission===this.service.mission)return;
    this.mission=this.service.mission;
    this.world.passengers.reset();this.immersion.reset();this.immersion.guide.destination=this.service.destinationPort;
    this.setMissionRoute();this.immersion.announce(`Escale terminée. Départ autorisé pour ${this.service.destinationName}.`);
  }
  private telemetry():Telemetry {
    const v=this.world.vessel,s=v.dynamics.state,c=v.dynamics.command;
    return {...s,speed:Math.hypot(s.surge,s.sway),commandPort:c.port,commandStarboard:c.starboard,contact:v.contact.label,damage:v.marine.damage,clearance:v.marine.clearance};
  }
  private arrivalPort():PortId|undefined {
    const destination=this.mission?.definition.destination;
    if(destination?.dockId)return destination.dockId==='malo'||destination.dockId==='dinard'?destination.dockId:undefined;
    return destination?.name.startsWith('Dinard')?'dinard':destination?.name.startsWith('Saint-Malo')?'malo':undefined;
  }
  private berthAvailable():boolean {
    const port=this.arrivalPort();return !port||!this.world.traffic.enabled||this.world.traffic.taxis.berths.availableToPlayer(port);
  }
  private timeDanger():string|undefined {
    const v=this.world.vessel;
    return accelerationDanger({state:v.dynamics.state,boat:v.parameters,shore:v.contact,marine:v.marine,traffic:this.world.traffic,
      mission:this.mode==='mission'?this.mission:undefined,actionPending:this.immersion.guide.actionPending});
  }
  private syncTimeButton():void {
    const rate=this.acceleration.multiplier;
    this.timeButton.textContent=`Temps ×${rate}`;
    this.timeButton.setAttribute('aria-label',`Vitesse du temps : ×${rate}. Passer à ×${TIME_RATES[(TIME_RATES.indexOf(rate)+1)%TIME_RATES.length]}`);
    this.timeButton.title='Vitesse du temps : ×1, ×2, ×4, ×8. Retour automatique à ×1 en cas de danger.';
    this.timeButton.setAttribute('data-accelerated',String(rate>1));
  }
  private showTimeNotice(reason:string):void {
    this.timeNotice.textContent=`Accélération désactivée — ${reason}`;this.timeNotice.hidden=false;this.noticeRemaining=5;
  }
  private enforceTimeSafety(reason?:string):void {
    if(this.acceleration.enforce(reason)){this.showTimeNotice(reason!);this.syncTimeButton();}
  }
  update(dt:number):void {
    if(this.paused)return;
    this.safetyTimer-=dt;
    if(this.acceleration.multiplier>1&&this.safetyTimer<=1e-8){this.enforceTimeSafety(this.timeDanger());this.safetyTimer=.1;}
    const v=this.world.vessel;
    this.syncMissionClock();
    v.moored=this.mode==='mission'&&!!this.mission?.moored;
    this.world.traffic.playerDestination=this.mode==='mission'&&(this.mission?.phase==='approach'||this.mission?.phase==='docking')?this.arrivalPort():undefined;
    this.helm.setEnabled(!v.moored);this.helm.update(dt);this.world.update(dt);
    if(this.mode==='mission'&&this.mission){
      if(this.world.passengers.count>0)this.mission.state.metrics.discomfort+=Math.max(0,v.marine.waves-.5)*dt*.025;
      const previous=this.mission,phase=previous.phase,visited=previous.state.visited.length;
      if(this.service){
        const arrived=this.service.update(dt,this.telemetry(),this.world.passengers.satisfaction);
        this.syncServiceMission(arrived);
        if(previous===this.mission&&phase==='boarding'&&this.mission.phase==='departure')this.immersion.announce(`Embarquement terminé. Départ autorisé pour ${this.service.destinationName}.`);
      }else this.mission.update(dt,this.telemetry());
      if(previous!==this.mission||phase!==this.mission.phase||visited!==this.mission.state.visited.length)this.enforceTimeSafety('étape de mission');
      if(this.mission.definition.excursion){
        const next=this.mission.waypoint;
        if(next?.comment&&Math.hypot(v.dynamics.state.x-next.x,v.dynamics.state.z-next.z)<(next.radius??130)){
          this.immersion.offerComment({id:`${this.mission.definition.id}-${this.mission.waypointIndex}`,x:next.x,z:next.z,radius:next.radius??130,...next.comment});
        }
        for(const index of this.mission.state.visited){
          const comment=this.mission.definition.route[index]?.comment;
          const point=this.mission.definition.route[index];
          if(comment)this.immersion.offerComment({id:`${this.mission.definition.id}-${index}`,x:point.x,z:point.z,radius:point.radius??130,...comment});
        }
      }
      this.syncMissionClock();
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
    if(this.immersion.guide.actionPending)this.enforceTimeSafety('action du joueur requise');
    this.autosave+=dt;if(this.autosave>=10){this.autosave=0;this.snapshot();}
  }
  render(dt:number):void {
    if(this.noticeRemaining>0){this.noticeRemaining=Math.max(0,this.noticeRemaining-dt);if(!this.noticeRemaining)this.timeNotice.hidden=true;}
    this.renderTimer+=dt;if(this.renderTimer<.2)return;this.renderTimer=0;
    if(!this.paused){
      const status=this.mode==='mission'&&this.mission?`${this.service&&this.mission.phase==='unloading'?'En escale':names[this.mission.phase]} · ${this.mission.definition.title}`:'Navigation libre · Deux moteurs';
      if(this.ui.status.textContent!==status)this.ui.status.textContent=status;
    }
    this.refreshHud();
    this.immersion.render();
  }
  private updatePassengers(dt:number):void {
    const m=this.mode==='mission'?this.mission:undefined,s=this.world.vessel.dynamics.state;
    const transfer=this.service?.transfer;
    this.world.passengers.update(dt,transfer?.phase??m?.phase??'free',transfer?.phaseTime??m?.state.phaseTime??0,transfer?.total??m?.definition.passengers??48,m?.definition.boardingSeconds??18,m?.definition.unloadingSeconds??12,Math.hypot(s.surge,s.sway),s.yawRate,this.world.vessel.marine.waves);
    const p=this.world.passengers;
    if(this.service&&m){
      p.waiting??={malo:0,dinard:0};
      p.waiting[this.service.originPort]=m.phase==='boarding'||m.phase==='preparation'?m.definition.passengers-p.count:servicePassengers(this.service.state.completed+2,this.world.vessel.parameters.passengers);
      p.waiting[this.service.destinationPort]=servicePassengers(this.service.state.completed+1,this.world.vessel.parameters.passengers);
      if(transfer){
        p.waiting[this.service.destinationPort]=transfer.phase==='unloading'?servicePassengers(this.service.state.completed+1,this.world.vessel.parameters.passengers):Math.max(0,transfer.total-p.count);
      }
      p.transferPort=m.phase==='unloading'?this.service.destinationPort:this.service.originPort;
    }else{p.waiting=undefined;p.transferPort=m?(m.phase==='unloading'||m.finished?m.definition.destination.dockId:m.definition.origin.dockId):undefined;}
  }
  private target():{x:number;z:number;label:string;radius?:number}|undefined {
    const m=this.mission;if(!m)return;
    if(m.phase==='crossing'||m.phase==='departure'){
      const s=this.world.vessel.dynamics.state,d=m.definition;
      if(d.excursion)return m.waypoint??{...d.destination.berth,label:d.destination.name};
      const arrivalDistance=Math.hypot(s.x-d.destination.berth.x,s.z-d.destination.berth.z);
      return d.route.find((p,i)=>!m.state.visited.includes(i)&&Math.hypot(p.x-d.destination.berth.x,p.z-d.destination.berth.z)<arrivalDistance-40)??{...d.destination.berth,label:d.destination.name};
    }
    return {...m.definition.destination.berth,label:m.definition.destination.name};
  }
  private refreshHud():void {
    const m=this.mission;if(!m)return;
    const set=(id:string,value:string)=>{const element=this.hud.querySelector(`#${id}`)!;if(element.textContent!==value)element.textContent=value;};
    set('objective-phase',names[m.phase]);set('objective-time',`${clock(m.state.elapsed)} / cible ${clock(m.definition.targetSeconds)}`);set('objective-comment',m.definition.comments[m.phase]);
    set('objective-clock',formatHour(this.world.vessel.marine.hour));
    this.hud.querySelector<HTMLElement>('#objective-count')!.hidden=!this.service;
    if(this.service){
      const s=this.service.state;
      const service=this.service,t=service.timing;
      const slot=service.slot;
      set('objective-time',`${slot.phase==='stopover'?'Escale':'Traversée'} ${clock(Math.ceil(slot.remaining))} / ${clock(slot.duration)}`);
      set('objective-clock',`${formatHour(service.hour)} · ${service.status}`);
      set('objective-phase',`→ ${this.service.destinationName}`);set('objective-count',`${s.completed} trajet${s.completed>1?'s':''} · ${s.transported} transportés`);
      const at=(seconds:number)=>formatHour(MALO_DINARD.departureHour+seconds/3600);
      set('objective-schedule',`Départ prévu ${at(t.scheduledDeparture)} · arrivée prévue ${at(t.arrivalDue)}${t.nextDeparture===null?'':` · prochain départ autorisé ${at(t.nextDeparture)}`}. Navigation ${clock(t.navigationSeconds)} · escales ${clock(t.stopoverSeconds)} · retard cumulé ${clock(service.cumulativeDelay)} · attente passée ${clock(t.skippedSeconds)}.`);
      set('objective-comment',`${m.definition.comments[m.phase]} Service : ${clock(s.elapsed)}. ${this.world.passengers.count} passagers à bord.${t.arrivedAt!==null?` Écart à l’accostage : ${t.arrivedAt<t.arrivalDue?'avance':'retard'} ${clock(Math.abs(t.arrivedAt-t.arrivalDue))}.`:''}`);
    }
    this.hud.querySelector<HTMLElement>('#objective-schedule')!.hidden=!this.service;
    this.hud.querySelector<HTMLElement>('#service-end')!.hidden=!this.service||!!this.service.result;
    const t=this.telemetry(),target=this.target();this.markers.update(this.world.vessel.marine.tide,target);
    this.hud.querySelector<HTMLButtonElement>('#mission-skip')!.hidden=!this.service?.canSkipWait||!dockingStatus(m.definition,t).valid;
    let guidance=target?`${target.label} · ${Math.round(Math.hypot(t.x-target.x,t.z-target.z))} m · cap conseillé ${Math.round(degrees(Math.atan2(target.x-t.x,-(target.z-t.z))))%360}°`:'';
    if(m.definition.excursion&&m.phase==='crossing') {
      const p=m.waypoint;
      guidance=`Étape ${Math.min(m.definition.route.length,m.state.visited.length+1)} / ${m.definition.route.length} · ${guidance}`;
      if(p?.dwellSeconds)guidance+=` · Panorama : ${Math.min(p.dwellSeconds,Math.floor(m.state.hold))} / ${p.dwellSeconds} s à moins de ${p.maxKnots} nd dans le cercle`;
    }
    if(m.phase==='boarding')guidance=`Embarquement · ${this.world.passengers.count} / ${m.definition.passengers} à bord`;
    if(m.phase==='unloading')guidance=`Accostage réussi · Débarquement ${Math.min(m.definition.passengers,Math.floor(m.definition.passengers*m.state.phaseTime/m.definition.unloadingSeconds))} / ${m.definition.passengers}`;
    if(this.service?.transfer&&this.service.transfer.phase!=='unloading')guidance=this.service.transfer.phase==='boarding'?`En escale · Embarquement ${this.world.passengers.count} / ${this.service.transfer.total}`:`En escale · départ autorisé dans ${clock(Math.ceil(this.service.waitRemaining))}`;
    if(this.service&&m.phase==='departure'&&!m.state.released)guidance=this.service.waitRemaining>1e-6?`En escale · départ autorisé dans ${clock(Math.ceil(this.service.waitRemaining))}`:'Départ autorisé · Larguez les amarres quand vous êtes prêt.';
    if(m.phase==='docking'){
      const d=dockingStatus(m.definition,t),limit=dockingRules(m.definition);
      const status=d.valid?'Prêt à amarrer':d.distance>limit.distance?'Rejoignez la zone ocre':d.speedKnots>=limit.speedKnots?'Réduisez la vitesse':t.contact?'Écartez le navire de l’obstacle':'Vérifiez le dégagement sous la quille';
      guidance=`Zone : ${d.distance.toFixed(0)} / ${limit.distance} m · ${d.speedKnots.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})} nd (moins de ${limit.speedKnots.toLocaleString('fr-FR')}) · ${status}`;
      if(!this.berthAvailable())guidance='Quai occupé — veuillez patienter';
    }
    if(this.service&&!m.moored&&this.service.delay>1e-6)guidance+=` · Retard +${clock(this.service.delay)}`;
    set('objective-guidance',guidance);
    const button=this.hud.querySelector<HTMLButtonElement>('#mission-action')!;
    button.hidden=!(m.phase==='departure'&&!m.state.released||m.phase==='docking');
    button.textContent=m.phase==='departure'?'Larguer les amarres':'Amarrer et débarquer';
    button.disabled=m.phase==='docking'?!dockingStatus(m.definition,t).valid||!this.berthAvailable():m.phase==='departure'&&!m.departureAllowed;
    const stages:MissionPhase[]=['boarding','departure','crossing','approach','docking','unloading'];
    this.hud.querySelector('#objective-steps')!.innerHTML=stages.map((p,i)=>`<li ${p===m.phase?'aria-current="step"':''}>${i<stages.indexOf(m.phase)?'✓ ':''}${names[p]}</li>`).join('');
    if(m.definition.excursion) this.hud.querySelector('#objective-steps')!.innerHTML+=m.definition.route.map((p,i)=>`<li ${i===m.waypointIndex?'aria-current="step"':''}>${m.state.visited.includes(i)?'✓ ':''}${escape(p.label)}${p.dwellSeconds?` · ${p.dwellSeconds} s, moins de ${p.maxKnots} nd`:''}</li>`).join('');
    document.querySelector('#app')!.classList.toggle('mission-active',this.mode==='mission'&&!m.finished);
  }
  private lockMissionSettings():void {
    const locked=this.mode==='mission'&&!!this.mission&&!this.mission.finished;
    this.settingsPanel.querySelector<HTMLSelectElement>('#sea-state')!.disabled=false;
    this.settingsPanel.querySelectorAll<HTMLInputElement|HTMLButtonElement>('#wind-direction,#marine-hour,#tide-phase,[data-marine]:not([data-marine="sound"])').forEach(el=>{el.disabled=locked;});
  }
  private snapshot():void {
    const m=this.mission,v=this.world.vessel;
    this.store.data.instruments=this.marinePanel.captureLayout();
    if(this.mode==='mission'&&m&&m.phase!=='preparation'&&!m.finished){
      this.store.data.active={shipId:v.shipId,missionId:m.definition.id,mission:structuredClone(m.state),vessel:{...v.dynamics.state},command:{...v.dynamics.command},marine:readMarine(v.marine),damage:v.marine.damage,passengers:this.world.passengers.snapshot(),tourVisited:[...this.immersion.guide.visited],service:this.service?structuredClone(this.service.state):undefined};
    }else if(this.mode==='mission'&&m?.finished)this.store.data.active=null;
    void this.store.save().then(()=>this.storageStatus());
  }
  private storageStatus():void {
    const status=this.dialog.querySelector('.game-storage');if(status)status.textContent=this.store.available?'Sauvegarde locale automatique · aucun compte requis':'Stockage indisponible : progression conservée pour cette session uniquement.';
    if(!this.store.available)this.ui.storageWarning();
  }
  dispose():void {this.snapshot();this.abort.abort();this.returnSettings();this.immersion.dispose();this.dialog.remove();this.hud.remove();this.menuButton.remove();this.markers.dispose();this.store.close();}
}
