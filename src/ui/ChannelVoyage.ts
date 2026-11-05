import { rendererLifetime } from '../world/RendererLifetime';
import { AmbientLight, Mesh, Plane, Vector3, Color, DirectionalLight, Fog, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BrittanySaintMaloModel } from '../ships/BrittanySaintMaloModel';
import { ChannelEnvironment,CHANNEL_FOG } from '../world/ChannelEnvironment';
import { channelDepth,unproject } from '../world/ChannelGeography';
import { Ocean } from '../world/Ocean';
import { WaveField } from '../weather/Waves';
import { ChannelNavigation } from '../core/ChannelNavigation';
import { FerryBridge,BRIDGE_STATIONS } from '../ships/FerryBridge';
import type { BridgeStation } from '../ships/FerryBridge';
import type { PropulsionMode } from '../energy/HybridPlant';
import { TrafficView } from '../world/TrafficView';
import { MaritimeAudio } from '../audio/MaritimeAudio';
import type { AudioSettings } from '../audio/MaritimeAudio';
import { IncidentPanel } from './IncidentPanel';
import { IncidentView } from '../world/IncidentView';
import { saveVoyage,restoreVoyage,clearVoyage } from '../saves/ChannelVoyageSave';
import { WakeView } from '../world/WakeView';
import { FerryLoadingView } from '../world/FerryLoadingView';
import { ChannelQuality } from '../core/ChannelQuality';
import { ChannelServicePanel } from './ChannelServicePanel';
import { CHANNEL_BERTHS } from '../world/ChannelGeography';
import { ChannelChart } from './ChannelChart';

export function openChannelVoyage(north=false,audioSettings?:AudioSettings):void{
 if(document.querySelector('.channel-voyage'))return;
 const previous=document.activeElement as HTMLElement|null,dialog=document.createElement('dialog');dialog.className='channel-voyage ferry-inspector';dialog.setAttribute('aria-labelledby','channel-title');
 dialog.innerHTML=`<header><div><h2 id="channel-title">Saint-Malo → Portsmouth</h2><p>Saint-Malo · Simulation · cartes inutilisables en navigation réelle</p></div><button data-close>Fermer</button></header><div class="channel-views"><canvas data-scene tabindex="0" aria-label="Navigation 3D dans la Manche"></canvas><aside><canvas data-chart role="img"></canvas><button data-map>Afficher le radar côtier</button><output data-gps></output><output data-status aria-live="polite"></output></aside></div><nav aria-label="Navigation"><button data-run>Démarrer</button><label>Poste<select data-station><option value="external">Extérieur</option><option value="central">Passerelle centrale</option><option value="port">Aileron bâbord</option><option value="starboard">Aileron tribord</option></select></label><button data-camera>Recentrer</button><label>Temps<select data-rate><option>1</option><option>2</option><option>4</option><option>8</option></select></label><label>Trafic<select data-density><option value="12">Léger</option><option value="20" selected>Équilibré</option><option value="28">Dense</option></select></label><button data-horn>Corne de brume</button><button data-neutral>Commandes au neutre</button></nav><p data-voyage-save class="ferry-note" role="status"></p><button data-new-voyage>Nouvelle traversée · effacer cette reprise</button><div data-incident-host></div><div class="ferry-helm"><label>Moteur bâbord<input aria-label="Moteur bâbord" data-port type="range" min="-1" max="1" step="0.05" value="0"></label><label>Moteur tribord<input aria-label="Moteur tribord" data-starboard type="range" min="-1" max="1" step="0.05" value="0"></label><label>Gouvernail<input aria-label="Gouvernail" data-rudder type="range" min="-1" max="1" step="0.05" value="0"></label><label>Étrave : bâbord / tribord<input aria-label="Propulseurs d'étrave" data-bow type="range" min="-1" max="1" step="0.05" value="0"></label></div><details class="ferry-energy" open><summary>Propulsion hybride et énergie</summary><div class="ferry-energy-controls"><label>Propulsion<select data-mode><option value="hybrid">Combinée GNL + batterie</option><option value="electric">Électrique</option><option value="lng">Thermique GNL</option></select></label><button data-charge>Brancher au quai</button><label>Conditions simulées<select data-weather><option value="breeze">Brise · 8 nd, courant 0,25 nd</option><option value="calm">Calme · sans courant</option><option value="rough">Vent 25 nd, courant 1 nd</option></select></label></div><output data-energy></output><p data-charge-note role="status">Recharge : près d'un poste, cap aligné, arrêté et commandes au neutre. Couper la liaison avant de manœuvrer.</p></details><p class="ferry-note">Itinéraire de jeu sans escale obligatoire. Accélération partagée avec le trafic. Carte, balisage, profondeurs et conduite simplifiés : inutilisables pour la navigation réelle. Fond régional : Natural Earth, domaine public.</p><p data-error hidden role="alert"></p>`;
 const controlsFooter=document.createElement('footer');controlsFooter.className='channel-controls';const nav=dialog.querySelector<HTMLElement>('nav')!,helm=dialog.querySelector<HTMLElement>('.ferry-helm')!,aside=dialog.querySelector<HTMLElement>('aside')!;
 const viewSettings=document.createElement('details');viewSettings.className='channel-options';viewSettings.innerHTML='<summary>Réglages, énergie et ambiance</summary><label>Graphismes<select data-quality><option value="auto">Automatique</option><option value="low">Léger</option><option value="medium">Équilibré</option><option value="high">Élevé</option></select></label><label>Heure<select data-hour><option value="14">14:00</option><option value="20">20:00</option><option value="0">00:00</option><option value="6">06:00</option></select></label><label><input type="checkbox" data-day-cycle checked> Cycle jour / nuit</label><button data-audio>Activer les sons</button><label><input type="checkbox" data-announcements> Annonces vocales des événements</label><output data-audio-note></output><output data-performance></output>';
 for(const field of ['data-rate','data-density'])viewSettings.append(dialog.querySelector('['+field+']')!.closest('label')!);viewSettings.append(dialog.querySelector('[data-camera]')!,dialog.querySelector('.ferry-energy')!,dialog.querySelector('[data-voyage-save]')!,dialog.querySelector('[data-error]')!);viewSettings.querySelector<HTMLDetailsElement>('.ferry-energy')!.open=false;
 aside.append(dialog.querySelector('[data-incident-host]')!,viewSettings);controlsFooter.append(nav,helm);dialog.append(controlsFooter);viewSettings.append(dialog.querySelector('.ferry-note:not([data-voyage-save])')!);
 const drawer=document.createElement('button');drawer.dataset.instruments='';drawer.textContent='Instruments et service';drawer.setAttribute('aria-expanded','false');nav.append(drawer);
 drawer.addEventListener('click',()=>{const open=dialog.classList.toggle('instruments-open');drawer.setAttribute('aria-expanded',String(open));});
 document.body.append(dialog);dialog.showModal();dialog.addEventListener('keydown',e=>e.stopPropagation());
 const canvas=dialog.querySelector<HTMLCanvasElement>('[data-scene]')!;
 let renderer:WebGLRenderer;
 try{renderer=new WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});}catch{
  const error=dialog.querySelector<HTMLElement>('[data-error]')!;error.hidden=false;error.textContent='WebGL indisponible : fermez cette vue et réessayez.';
  dialog.querySelector('[data-close]')!.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{dialog.remove();previous?.focus();},{once:true});return;
 }
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));
 const scene=new Scene();scene.background=new Color(0xb3c8d0);scene.fog=new Fog(0xb3c8d0,7000,CHANNEL_FOG);
 scene.add(new AmbientLight(0xffffff,1.7));const sun=new DirectionalLight(0xfff3df,2.3);sun.position.set(-500,900,-300);scene.add(sun);
 const camera=new PerspectiveCamera(50,1,1,35000),controls=new OrbitControls(camera,canvas);controls.minDistance=120;controls.maxDistance=4500;controls.maxPolarAngle=Math.PI*.48;controls.enablePan=false;
 const resetCamera=()=>{controls.target.set(0,12,0);camera.position.set(-270,150,320);controls.update();};resetCamera();
 const model=new BrittanySaintMaloModel();const releaseRendererTextures=rendererLifetime(model.exterior);scene.add(model.root);
 const bridge=new FerryBridge();scene.add(bridge.root);bridge.root.visible=false;
 const clip=new Plane(new Vector3(0,-1,0),24);renderer.localClippingEnabled=true;
 let station:BridgeStation|'external'='external';const axis=new Vector3(0,1,0),eye=new Vector3(),look=new Vector3();
 const floating={heave:0,pitch:0,roll:0},targetFloat={heave:0,pitch:0,roll:0};
 const env=new ChannelEnvironment();scene.add(env.root);
 const water=new WaveField(),ocean=new Ocean('low',water,70000);scene.add(ocean.mesh);ocean.material.uniforms.uFog.value.copy(scene.background);ocean.material.uniforms.uFogNear.value=7000;ocean.material.uniforms.uFogFar.value=CHANNEL_FOG;
 ocean.material.uniforms.uHull.value.set(194.7,27.8);ocean.material.uniforms.uSun.value=ocean.material.uniforms.uSun.value.clone();const loading=new FerryLoadingView();scene.add(loading.root);
 const quality=new ChannelQuality(navigator.hardwareConcurrency);
 const navigation=new ChannelNavigation(),chart=new ChannelChart(dialog.querySelector('[data-chart]')!);const wake=new WakeView(ocean,navigation.wake);scene.add(wake.mesh);
 try{navigation.incidents.state.seed=crypto.getRandomValues(new Uint32Array(1))[0];}catch{navigation.incidents.state.seed=Date.now()>>>0;}
 navigation.initializeVoyage(north);
 let discardSave=false;let storage:Storage|undefined;try{storage=localStorage;}catch{/* Keep session usable. */}
 const resumed=storage?restoreVoyage(navigation,north,storage):false;
 const saveNote=dialog.querySelector<HTMLElement>('[data-voyage-save]')!;saveNote.textContent=resumed?'Traversée reprise en pause, interventions et conséquences conservées.':storage?'Sauvegarde automatique de cette traversée sur cet appareil.':'Sauvegarde locale indisponible ; session jouable.';
 const persist=()=>{if(storage&&!discardSave)saveNote.textContent=saveVoyage(navigation,north,storage)?'Traversée sauvegardée sur cet appareil.':'Sauvegarde locale indisponible ; session toujours jouable.';};
 wake.trail.parameters=navigation.dynamics.parameters;const servicePanel=new ChannelServicePanel(navigation,aside);
 const incidents=new IncidentPanel(navigation,dialog.querySelector('[data-incident-host]')!);dialog.querySelector('.incident-settings')!.append(dialog.querySelector('[data-new-voyage]')!);
 const incidentView=new IncidentView();scene.add(incidentView.root);
 dialog.querySelector<HTMLSelectElement>('[data-rate]')!.value=String(navigation.requestedRate);dialog.querySelector<HTMLSelectElement>('[data-mode]')!.value=navigation.dynamics.plant.mode;
 for(const key of ['port','starboard','rudder'] as const)dialog.querySelector<HTMLInputElement>('[data-'+key+']')!.value=String(navigation.dynamics.command[key]);dialog.querySelector<HTMLInputElement>('[data-bow]')!.value=String(navigation.dynamics.bowCommand);
 chart.draw(navigation.state);bridge.update(navigation.dynamics,navigation.traffic.agents);
 const trafficView=new TrafficView(navigation.traffic,true);scene.add(trafficView.root);
 const audio=new MaritimeAudio();audio.apply(audioSettings??audio.settings);dialog.querySelector('[data-audio]')!.textContent=audio.settings.enabled?'Couper les sons':'Activer les sons';
 if(navigator.hardwareConcurrency<=4)navigation.traffic.limit=12;dialog.querySelector<HTMLSelectElement>('[data-density]')!.value=String(navigation.traffic.limit);
 const run=dialog.querySelector<HTMLButtonElement>('[data-run]')!,status=dialog.querySelector<HTMLOutputElement>('[data-status]')!,gps=dialog.querySelector<HTMLOutputElement>('[data-gps]')!;
 const resize=()=>{const r=canvas.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=r.width/Math.max(1,r.height);camera.fov=station==='external'?50:camera.aspect<1?75:60;camera.updateProjectionMatrix();};
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 const abort=new AbortController(),options={signal:abort.signal};let frame=0,last=performance.now(),time=navigation.simTime,uiTime=.2,saveTime=0,closed=false,lastSerial=navigation.incidents.state.serial,lastHistory=navigation.incidents.state.history.length;
 dialog.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest('button');if(!b)return;
  if(b.hasAttribute('data-new-voyage')){discardSave=true;if(storage)clearVoyage(north,storage);dialog.addEventListener('close',()=>openChannelVoyage(north,audioSettings),{once:true});dialog.close();return;}
  if(b.hasAttribute('data-close'))dialog.close();
  if(b.hasAttribute('data-audio')){audio.apply({...audio.settings,enabled:!audio.settings.enabled});audio.setPaused(!navigation.running);audio.unlock();b.textContent=audio.settings.enabled?'Couper les sons':'Activer les sons';dialog.querySelector('[data-audio-note]')!.textContent=audio.settings.enabled?'Audio activé par votre geste. Les annonces dépendent des voix disponibles sur cet appareil.':'Sons coupés.';}
  if(b.hasAttribute('data-horn')){if(navigation.running){audio.setPaused(false);audio.apply({...audio.settings,enabled:true});audio.unlock();dialog.querySelector('[data-audio]')!.textContent='Couper les sons';if(audio.startHorn())navigation.traffic.horn(navigation.state);}}
  if(b.hasAttribute('data-run')){navigation.collision='';navigation.running=!navigation.running;audio.setPaused(!navigation.running);audio.unlock();}
  if(b.hasAttribute('data-camera')&&station==='external')resetCamera();
  if(b.hasAttribute('data-map')){chart.radar=!chart.radar;b.textContent=chart.radar?'Afficher la carte de la Manche':'Afficher le radar côtier';chart.draw(navigation.state);}
  if(b.hasAttribute('data-neutral')){for(const key of ['port','starboard','rudder','bow'])dialog.querySelector<HTMLInputElement>('[data-'+key+']')!.value='0';sendHelm();}
  if(b.hasAttribute('data-charge')){const ok=navigation.toggleCharge();for(const key of ['port','starboard','rudder','bow'])dialog.querySelector<HTMLInputElement>('[data-'+key+']')!.disabled=navigation.dynamics.plant.shore;dialog.querySelector('[data-charge-note]')!.textContent=ok?(navigation.dynamics.plant.shore?'Liaison quai active : démarrer la simulation pour charger. Commandes verrouillées.':'Liaison quai débranchée.'):'Recharge refusée : rejoindre un poste, aligner le cap, arrêter le navire et mettre au neutre.';}
 },options);
 function sendHelm(){if(navigation.dynamics.plant.shore||navigation.service.immobilized)return;const value=(key:string)=>Number(dialog.querySelector<HTMLInputElement>('[data-'+key+']')!.value);navigation.dynamics.setCommand({port:value('port'),starboard:value('starboard'),rudder:value('rudder')});navigation.dynamics.bowCommand=value('bow');}
 for(const field of ['port','starboard','rudder','bow'])dialog.querySelector('[data-'+field+']')!.addEventListener('input',sendHelm,options);
 dialog.querySelector('[data-rate]')!.addEventListener('change',e=>navigation.requestedRate=Number((e.target as HTMLSelectElement).value),options);
 dialog.querySelector('[data-density]')!.addEventListener('change',e=>navigation.traffic.limit=Number((e.target as HTMLSelectElement).value),options);
 const applyQuality=()=>{ocean.setQuality(quality.quality);env.setQuality(quality.quality);renderer.setPixelRatio(Math.min(devicePixelRatio,quality.quality==='low'?1:quality.quality==='medium'?1.25:1.5));resize();};
 dialog.querySelector('[data-quality]')!.addEventListener('change',e=>{if(quality.choose((e.target as HTMLSelectElement).value as 'auto'|'low'|'medium'|'high'))applyQuality();},options);
 dialog.querySelector('[data-hour]')!.addEventListener('change',e=>navigation.hour=Number((e.target as HTMLSelectElement).value),options);dialog.querySelector('[data-day-cycle]')!.addEventListener('change',e=>navigation.dayCycle=(e.target as HTMLInputElement).checked,options);
 dialog.querySelector('[data-mode]')!.addEventListener('change',e=>navigation.dynamics.plant.mode=(e.target as HTMLSelectElement).value as PropulsionMode,options);
 dialog.querySelector('[data-station]')!.addEventListener('change',e=>{station=(e.target as HTMLSelectElement).value as BridgeStation|'external';controls.enabled=station==='external';bridge.root.visible=station!=='external';model.root.traverse(o=>{if(o instanceof Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){m.clippingPlanes=station==='external'?null:[clip];m.needsUpdate=true;}});if(station==='external')resetCamera();resize();},options);
 dialog.querySelector('[data-weather]')!.addEventListener('change',e=>{const preset=(e.target as HTMLSelectElement).value;Object.assign(navigation.dynamics.environment,preset==='calm'?{windKnots:0,currentKnots:0,waves:.1}:preset==='rough'?{windKnots:25,currentKnots:1,waves:2.5}:{windKnots:8,currentKnots:.25,waves:.6});},options);
 canvas.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();run.click();}if(e.code==='KeyN'){dialog.querySelector<HTMLButtonElement>('[data-neutral]')!.click();}},options);
 const pause=()=>{navigation.running=false;persist();last=performance.now();};document.addEventListener('visibilitychange',pause,options);
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();pause();cancelAnimationFrame(frame);const error=dialog.querySelector<HTMLElement>('[data-error]')!;error.hidden=false;error.textContent='Contexte WebGL perdu. Fermez puis rouvrez le pilotage.';},options);
 function render(now:number){if(closed)return;frame=requestAnimationFrame(render);if(document.hidden){last=now;return;}if(now-last<32)return;
  const dt=Math.min(.1,(now-last)/1000);last=now;const previousTime=navigation.simTime;navigation.advance(dt);const simulated=navigation.simTime-previousTime;audio.setPaused(!navigation.running);time=navigation.simTime;uiTime+=dt;

  const s=navigation.state,e=navigation.dynamics.weather;water.update(simulated,{waves:e.waves,wind:e.windKnots,direction:e.windFrom});
  // Double precision geographic state; all rendered objects remain near the vessel origin.
  env.root.position.set(-s.x,0,-s.z);env.update(s.x,s.z,time);
  water.hull(s.x,s.z,s.heading,194.7,27.8,0,targetFloat);for(const key of ['heave','pitch','roll'] as const)floating[key]+=(targetFloat[key]-floating[key])*(1-Math.exp(-dt/3));
  model.root.position.set(0,floating.heave,0);model.root.rotation.set(floating.pitch*.6,-s.heading,floating.roll*.6,'YXZ');model.setRampProgress(navigation.service.state.ramp);loading.render(navigation.service,s.heading,floating.heave,s);
  bridge.root.position.set(0,24.2+floating.heave,-68).applyAxisAngle(axis,-s.heading);bridge.root.rotation.y=-s.heading;clip.constant=24+floating.heave;
  if(station!=='external'){bridge.root.updateMatrixWorld(true);camera.position.copy(bridge.root.localToWorld(eye.copy(BRIDGE_STATIONS[station].eye)));camera.lookAt(bridge.root.localToWorld(look.copy(BRIDGE_STATIONS[station].look)));}
  incidentView.render(navigation);trafficView.render(0,time,s,water,0);trafficView.root.position.set(-s.x,0,-s.z);ocean.update(time,s,water,0,0,e.waves,s,s);wake.render(time,{currentX:Math.sin(e.currentTo*Math.PI/180)*e.currentKnots*1852/3600,currentZ:-Math.cos(e.currentTo*Math.PI/180)*e.currentKnots*1852/3600},s);
  const light=Math.max(0,Math.sin((navigation.hour-6)/24*Math.PI*2)),skyLight=.08+.92*light;sun.intensity=.1+2.3*light;scene.children.filter(o=>o instanceof AmbientLight).forEach(o=>(o as AmbientLight).intensity=.25+1.45*light);sun.position.set(Math.cos(navigation.hour/24*Math.PI*2)*800,Math.sin((navigation.hour-6)/24*Math.PI*2)*900,300);(scene.background as Color).setRGB(.003+.65*light,.006+.73*light,.012+.74*light);(scene.fog as Fog).color.copy(scene.background as Color);(scene.fog as Fog).far=CHANNEL_FOG/(1+Math.max(0,e.waves-1)*.3);(scene.fog as Fog).near=(scene.fog as Fog).far*.3;ocean.material.uniforms.uFogNear.value=(scene.fog as Fog).near;ocean.material.uniforms.uFogFar.value=(scene.fog as Fog).far;ocean.material.uniforms.uFog.value.copy(scene.background);ocean.material.uniforms.uLight.value=skyLight;model.setNight(1-light);ocean.material.uniforms.uSun.value.copy(sun.position).normalize();
  audio.update(s,{waves:e.waves,wind:e.windKnots,sound:true,warning:'',time:now/1000},!!navigation.traffic.risk,Math.min(...CHANNEL_BERTHS.map(b=>Math.hypot(s.x-b.point[0],s.z-b.point[1]))),navigation.dynamics.plant.mode==='electric'?.15:1);
  if(navigation.incidents.state.serial!==lastSerial){lastSerial=navigation.incidents.state.serial;const event=navigation.incidents.state.active.at(-1);if(event&&navigation.running){audio.horn();if(dialog.querySelector<HTMLInputElement>('[data-announcements]')!.checked)audio.speak('Message de bord. '+navigation.incidents.definition(event.kind).title+'. Consultez le panneau incidents.');}}
  if(navigation.incidents.state.history.length!==lastHistory){lastHistory=navigation.incidents.state.history.length;if(navigation.running)audio.repair();}
  if(station==='external')controls.update();renderer.render(scene,camera);if(quality.observe(now))applyQuality();
  saveTime+=dt;if(saveTime>10){saveTime=0;persist();}
  if(uiTime>.2){uiTime=0;incidents.render();servicePanel.render();dialog.querySelector('#channel-title')!.textContent=navigation.service.state.origin===0?'Saint-Malo → Portsmouth':'Portsmouth → Saint-Malo';dialog.querySelector('[data-performance]')!.textContent='Qualité '+quality.quality+' · '+(quality.fps?quality.fps.toFixed(1)+' FPS observés':'mesure en cours')+' · '+renderer.info.render.calls+' appels de dessin';chart.draw(s,navigation.traffic.agents);bridge.update(navigation.dynamics,navigation.traffic.agents);
   const plant=navigation.dynamics.plant;dialog.querySelector('[data-energy]')!.textContent='Batterie '+(plant.soc*100).toFixed(1)+' % · '+plant.batteryKWh.toFixed(0)+' kWh / 11 200\nGNL '+(plant.fuelKg/1000).toFixed(2)+' t · consommation '+plant.fuelKgHour.toFixed(0)+' kg/h\nPuissance fournie '+(plant.deliveredKW/1000).toFixed(2)+' MW · disponible '+(plant.availableKW/1000).toFixed(2)+' MW\nBatterie '+(plant.batteryKW/1000).toFixed(2)+' MW · thermique '+(plant.thermalKW/1000).toFixed(2)+' MW · moteurs actifs '+plant.enginesOnline+'\nTransmission B/T '+Math.round(navigation.state.port*100)+' / '+Math.round(navigation.state.starboard*100)+' % · étrave '+Math.round(navigation.dynamics.bowActual*100)+' %\nRecharge quai '+(plant.chargeKW/1000).toFixed(2)+' MW';
   dialog.querySelector('[data-charge]')!.textContent=plant.shore?'Débrancher le quai':'Brancher au quai';for(const field of ['port','starboard','rudder','bow'])dialog.querySelector<HTMLInputElement>('[data-'+field+']')!.disabled=plant.shore||navigation.service.immobilized;const geo=unproject(s.x,s.z);gps.textContent=`GPS de jeu ${geo.lat.toFixed(4)}° N · ${Math.abs(geo.lon).toFixed(4)}° O\nSOG ${(navigation.dynamics.groundSpeed*3600/1852).toFixed(1)} nd · eau ${(s.surge*3600/1852).toFixed(1)} nd · cap ${((s.heading*180/Math.PI%360+360)%360).toFixed(1)}° · fond fictif ${channelDepth(s.x,s.z)} m`;
   status.textContent=navigation.collision?`Arrêt avant obstacle : ${navigation.collision}`:navigation.service.state.phase==='complete'?'Traversée terminée':`${navigation.zone==='port'?'Zone portuaire':navigation.zone==='approach'?'Approche':'Large'} · temps ×${navigation.rate}${navigation.guided?' · reconnaissance': ' · pilotage ferry · '+navigation.traffic.agents.filter(a=>a.active).length+' navires'+(navigation.traffic.risk?' · '+navigation.traffic.risk:'')}`;
   run.textContent=navigation.running?'Pause':'Continuer';
  }
 }
 dialog.addEventListener('close',()=>{persist();closed=true;cancelAnimationFrame(frame);abort.abort();observer.disconnect();controls.dispose();releaseRendererTextures();model.dispose();wake.dispose();loading.dispose();bridge.dispose();incidentView.dispose();trafficView.dispose();audio.dispose();env.dispose();ocean.dispose();renderer.dispose();renderer.forceContextLoss();dialog.remove();previous?.focus();},{once:true});
 const hourSelect=dialog.querySelector<HTMLSelectElement>('[data-hour]')!,savedHour=navigation.hour.toFixed(2);hourSelect.add(new Option(Math.floor(navigation.hour).toString().padStart(2,'0')+':'+Math.floor(navigation.hour%1*60).toString().padStart(2,'0'),savedHour));hourSelect.value=savedHour;dialog.querySelector<HTMLInputElement>('[data-day-cycle]')!.checked=navigation.dayCycle;applyQuality();frame=requestAnimationFrame(render);run.focus();
}
