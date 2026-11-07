import './ChannelMode.css';
import { channelModeUI } from './ChannelModeUI';
import { mountCompanyMode } from './CompanyMode';
import { HelmControls } from './HelmControls';
import { icon } from './icons';
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

export interface ChannelSession {pause():void;resume():void;dispose():void;}
export function openChannelVoyage(north=false,audioSettings?:AudioSettings,actions:{menu():void;restart():void}={menu:()=>{},restart:()=>{}}):ChannelSession{
 if(document.querySelector('.brittany-mode'))throw new Error('Brittany Ferries is already active');
 const previous=document.activeElement as HTMLElement|null,root=channelModeUI();
 const unmount=mountCompanyMode(document.querySelector('#app')!,root);
 const showPanel=(name:string|undefined)=>{root.querySelectorAll<HTMLElement>('[data-mode-panel]').forEach(p=>p.hidden=p.dataset.modePanel!==name);root.querySelectorAll('[data-panel]').forEach(b=>b.setAttribute('aria-expanded',String((b as HTMLElement).dataset.panel===name)));};
 let dispose=()=>{};
 const canvas=root.querySelector<HTMLCanvasElement>('[data-scene]')!;
 let renderer:WebGLRenderer;
 try{renderer=new WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'}); }catch(error){unmount();throw error;}
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
 const navigation=new ChannelNavigation(),chart=new ChannelChart(root.querySelector('[data-chart]')!);const wake=new WakeView(ocean,navigation.wake);scene.add(wake.mesh);
 try{navigation.incidents.state.seed=crypto.getRandomValues(new Uint32Array(1))[0];}catch{navigation.incidents.state.seed=Date.now()>>>0;}
 navigation.initializeVoyage(north);
 let discardSave=false;let storage:Storage|undefined;try{storage=localStorage;}catch{/* Keep session usable. */}
 const resumed=storage?restoreVoyage(navigation,north,storage):false;
 const saveNote=root.querySelector<HTMLElement>('[data-voyage-save]')!;saveNote.textContent=resumed?'Traversée reprise en pause, interventions et conséquences conservées.':storage?'Sauvegarde automatique de cette traversée sur cet appareil.':'Sauvegarde locale indisponible ; session jouable.';
 const persist=()=>{if(storage&&!discardSave)saveNote.textContent=saveVoyage(navigation,north,storage)?'Traversée sauvegardée sur cet appareil.':'Sauvegarde locale indisponible ; session toujours jouable.';};
 wake.trail.parameters=navigation.dynamics.parameters;const servicePanel=new ChannelServicePanel(navigation,root.querySelector('[data-service-host]')!);
 const incidents=new IncidentPanel(navigation,root.querySelector('[data-incident-host]')!);
 const incidentView=new IncidentView();scene.add(incidentView.root);
 root.querySelector<HTMLSelectElement>('[data-rate]')!.value=String(navigation.requestedRate);root.querySelector<HTMLSelectElement>('[data-mode]')!.value=navigation.dynamics.plant.mode;
 root.querySelector<HTMLInputElement>('[data-bow]')!.value=String(navigation.dynamics.bowCommand);
 chart.draw(navigation.state);bridge.update(navigation.dynamics,navigation.traffic.agents);
 const trafficView=new TrafficView(navigation.traffic,true);scene.add(trafficView.root);
 const audio=new MaritimeAudio();audio.apply(audioSettings??audio.settings);root.querySelector('[data-audio]')!.textContent=audio.settings.enabled?'Couper les sons':'Activer les sons';
 if(navigator.hardwareConcurrency<=4)navigation.traffic.limit=12;root.querySelector<HTMLSelectElement>('[data-density]')!.value=String(navigation.traffic.limit);
 const run=root.querySelector<HTMLButtonElement>('[data-run]')!,status=root.querySelector<HTMLOutputElement>('[data-status]')!,gps=root.querySelector<HTMLOutputElement>('[data-gps]')!;
 const resize=()=>{const r=canvas.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=r.width/Math.max(1,r.height);camera.fov=station==='external'?50:camera.aspect<1?75:60;camera.updateProjectionMatrix();};
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 const helm=new HelmControls(navigation.dynamics,mode=>{const select=root.querySelector<HTMLSelectElement>('[data-station]')!;select.value=mode==='cockpit'?'central':'external';select.dispatchEvent(new Event('change'));},()=>station==='external'?'external':'cockpit',{root:root,idPrefix:'brittany-',name:()=> 'Saint-Malo',speed:()=>navigation.dynamics.groundSpeed*3600/1852,clearance:()=>channelDepth(navigation.state.x,navigation.state.z)-6.6,nearby:()=>navigation.destination.name+' · '+Math.round(navigation.remaining/1852)+' milles de route'});
 helm.setEnabled(false);
 root.querySelector('.helm-actions')!.innerHTML='<button id="brittany-fog-horn" data-helm-id="fog-horn" data-horn>'+icon('horn')+'Corne de brume</button>';
 const abort=new AbortController(),options={signal:abort.signal};let frame=0,last=performance.now(),time=navigation.simTime,uiTime=.2,saveTime=0,closed=false,lastSerial=navigation.incidents.state.serial,lastHistory=navigation.incidents.state.history.length;
 root.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest('button');if(!b)return;
  if(b.hasAttribute('data-new-voyage')){discardSave=true;if(storage)clearVoyage(north,storage);actions.restart();return;}
  if(b.hasAttribute('data-menu'))actions.menu();
  if(b.hasAttribute('data-panel')){const name=b.dataset.panel!;const panel=root.querySelector<HTMLElement>('[data-mode-panel="'+name+'"]')!;const radar=b.dataset.chartMode==='radar',same=chart.radar===radar;showPanel(!panel.hidden&&(name!=='chart'||same)?undefined:name);if(name==='chart'){chart.radar=radar;chart.draw(navigation.state);root.querySelector('[data-chart-title]')!.textContent=radar?'Radar côtier':'Carte de la Manche';}}
  if(b.hasAttribute('data-panel-close')){showPanel(undefined);canvas.focus();}
  if(b.hasAttribute('data-zoom')&&station==='external'){camera.position.sub(controls.target).multiplyScalar(Number(b.dataset.zoom)).clampLength(120,4500).add(controls.target);controls.update();}
  if(b.hasAttribute('data-audio')){audio.apply({...audio.settings,enabled:!audio.settings.enabled});audio.setPaused(!navigation.running);audio.unlock();b.textContent=audio.settings.enabled?'Couper les sons':'Activer les sons';root.querySelector('[data-audio-note]')!.textContent=audio.settings.enabled?'Audio activé par votre geste. Les annonces dépendent des voix disponibles sur cet appareil.':'Sons coupés.';}
  if(b.hasAttribute('data-horn')){if(navigation.running){audio.setPaused(false);audio.apply({...audio.settings,enabled:true});audio.unlock();root.querySelector('[data-audio]')!.textContent='Couper les sons';if(audio.startHorn())navigation.traffic.horn(navigation.state);}}
  if(b.hasAttribute('data-run')){navigation.collision='';navigation.running=!navigation.running;helm.setEnabled(navigation.running&&!navigation.service.immobilized&&!navigation.dynamics.plant.shore);audio.setPaused(!navigation.running);audio.unlock();}
  if(b.hasAttribute('data-camera')&&station==='external')resetCamera();
  if(b.hasAttribute('data-map')){chart.radar=!chart.radar;b.textContent=chart.radar?'Afficher la carte de la Manche':'Afficher le radar côtier';chart.draw(navigation.state);}
  if(b.hasAttribute('data-bow-neutral')){navigation.dynamics.bowCommand=0;root.querySelector<HTMLInputElement>('[data-bow]')!.value='0';}
  if(b.hasAttribute('data-charge')){const ok=navigation.toggleCharge();helm.setEnabled(navigation.running&&!navigation.service.immobilized&&!navigation.dynamics.plant.shore);root.querySelector('[data-charge-note]')!.textContent=ok?(navigation.dynamics.plant.shore?'Liaison quai active : démarrer la simulation pour charger. Commandes verrouillées.':'Liaison quai débranchée.'):'Recharge refusée : rejoindre un poste, aligner le cap, arrêter le navire et mettre au neutre.';}
 },options);
 root.querySelector('[data-bow]')!.addEventListener('input',e=>{if(!navigation.dynamics.plant.shore&&!navigation.service.immobilized)navigation.dynamics.bowCommand=Number((e.target as HTMLInputElement).value);},options);
 root.querySelector('[data-rate]')!.addEventListener('change',e=>navigation.requestedRate=Number((e.target as HTMLSelectElement).value),options);
 root.querySelector('[data-density]')!.addEventListener('change',e=>navigation.traffic.limit=Number((e.target as HTMLSelectElement).value),options);
 const applyQuality=()=>{ocean.setQuality(quality.quality);env.setQuality(quality.quality);renderer.setPixelRatio(Math.min(devicePixelRatio,quality.quality==='low'?1:quality.quality==='medium'?1.25:1.5));resize();};
 root.querySelector('[data-quality]')!.addEventListener('change',e=>{if(quality.choose((e.target as HTMLSelectElement).value as 'auto'|'low'|'medium'|'high'))applyQuality();},options);
 root.querySelector('[data-hour]')!.addEventListener('change',e=>navigation.hour=Number((e.target as HTMLSelectElement).value),options);root.querySelector('[data-day-cycle]')!.addEventListener('change',e=>navigation.dayCycle=(e.target as HTMLInputElement).checked,options);
 root.querySelector('[data-mode]')!.addEventListener('change',e=>navigation.dynamics.plant.mode=(e.target as HTMLSelectElement).value as PropulsionMode,options);
 root.querySelector('[data-station]')!.addEventListener('change',e=>{station=(e.target as HTMLSelectElement).value as BridgeStation|'external';controls.enabled=station==='external';bridge.root.visible=station!=='external';model.root.traverse(o=>{if(o instanceof Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){m.clippingPlanes=station==='external'?null:[clip];m.needsUpdate=true;}});if(station==='external')resetCamera();resize();},options);
 root.querySelector('[data-weather]')!.addEventListener('change',e=>{const preset=(e.target as HTMLSelectElement).value;Object.assign(navigation.dynamics.environment,preset==='calm'?{windKnots:0,currentKnots:0,waves:.1}:preset==='rough'?{windKnots:25,currentKnots:1,waves:2.5}:{windKnots:8,currentKnots:.25,waves:.6});},options);
 root.addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();if([...root.querySelectorAll<HTMLElement>('[data-mode-panel]')].some(p=>!p.hidden)){showPanel(undefined);canvas.focus();}else actions.menu();}},options);
 const pause=()=>{navigation.running=false;persist();last=performance.now();};document.addEventListener('visibilitychange',pause,options);window.addEventListener('pagehide',persist,options);
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();pause();cancelAnimationFrame(frame);const error=root.querySelector<HTMLElement>('[data-error]')!;error.hidden=false;showPanel('settings');error.textContent='Contexte WebGL perdu. Fermez puis rouvrez le pilotage.';},options);
 function render(now:number){if(closed)return;frame=requestAnimationFrame(render);if(document.hidden){last=now;return;}if(now-last<32)return;
  const dt=Math.min(.1,(now-last)/1000);last=now;if(document.querySelector('.ferry-inspector'))return;helm.update(dt*navigation.rate);const previousTime=navigation.simTime;navigation.advance(dt);const simulated=navigation.simTime-previousTime;audio.setPaused(!navigation.running);time=navigation.simTime;uiTime+=dt;

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
  if(navigation.incidents.state.serial!==lastSerial){lastSerial=navigation.incidents.state.serial;const event=navigation.incidents.state.active.at(-1);if(event&&navigation.running){audio.horn();if(root.querySelector<HTMLInputElement>('[data-announcements]')!.checked)audio.speak('Message de bord. '+navigation.incidents.definition(event.kind).title+'. Consultez le panneau incidents.');}}
  if(navigation.incidents.state.history.length!==lastHistory){lastHistory=navigation.incidents.state.history.length;if(navigation.running)audio.repair();}
  if(station==='external')controls.update();renderer.render(scene,camera);if(quality.observe(now))applyQuality();
  saveTime+=dt;if(saveTime>10){saveTime=0;persist();}
  if(uiTime>.2){uiTime=0;incidents.render();servicePanel.render();root.querySelector('[data-performance]')!.textContent='Qualité '+quality.quality+' · '+(quality.fps?quality.fps.toFixed(1)+' FPS observés':'mesure en cours')+' · '+renderer.info.render.calls+' appels de dessin';chart.draw(s,navigation.traffic.agents,navigation.incidents.modifiers.radarUnavailable);bridge.update(navigation.dynamics,navigation.traffic.agents);
   const plant=navigation.dynamics.plant;root.querySelector('[data-energy]')!.textContent='Batterie '+(plant.soc*100).toFixed(1)+' % · '+plant.batteryKWh.toFixed(0)+' kWh / 11 200\nGNL '+(plant.fuelKg/1000).toFixed(2)+' t · consommation '+plant.fuelKgHour.toFixed(0)+' kg/h\nPuissance fournie '+(plant.deliveredKW/1000).toFixed(2)+' MW · disponible '+(plant.availableKW/1000).toFixed(2)+' MW\nBatterie '+(plant.batteryKW/1000).toFixed(2)+' MW · thermique '+(plant.thermalKW/1000).toFixed(2)+' MW · moteurs actifs '+plant.enginesOnline+'\nTransmission B/T '+Math.round(navigation.state.port*100)+' / '+Math.round(navigation.state.starboard*100)+' % · étrave '+Math.round(navigation.dynamics.bowActual*100)+' %\nRecharge quai '+(plant.chargeKW/1000).toFixed(2)+' MW';
   root.querySelector('[data-charge]')!.textContent=plant.shore?'Débrancher le quai':'Brancher au quai';root.querySelector<HTMLInputElement>('[data-bow]')!.disabled=plant.shore||navigation.service.immobilized;helm.setEnabled(navigation.running&&!plant.shore&&!navigation.service.immobilized);helm.refresh();const geo=unproject(s.x,s.z);gps.textContent=`GPS de jeu ${geo.lat.toFixed(4)}° N · ${Math.abs(geo.lon).toFixed(4)}° O\nSOG ${(navigation.dynamics.groundSpeed*3600/1852).toFixed(1)} nd · eau ${(s.surge*3600/1852).toFixed(1)} nd · cap ${((s.heading*180/Math.PI%360+360)%360).toFixed(1)}° · fond fictif ${channelDepth(s.x,s.z)} m`;
   status.textContent=navigation.collision?`Arrêt avant obstacle : ${navigation.collision}`:navigation.incidents.modifiers.evacuating?'Évacuation générale en cours':navigation.service.state.phase==='complete'?(navigation.service.state.evacuated?'Service interrompu · évacuation achevée':'Traversée terminée'):`${navigation.zone==='port'?'Zone portuaire':navigation.zone==='approach'?'Approche':'Large'} · temps ×${navigation.rate}${navigation.guided?' · reconnaissance': ' · pilotage ferry · '+navigation.traffic.agents.filter(a=>a.active).length+' navires'+(navigation.traffic.risk?' · '+navigation.traffic.risk:'')}`;
   run.innerHTML=icon('pause')+'<span>'+(navigation.running?'Pause':'Continuer')+'</span>';run.setAttribute('aria-pressed',String(!navigation.running));
  }
 }
 dispose=()=>{if(closed)return;persist();closed=true;cancelAnimationFrame(frame);abort.abort();observer.disconnect();controls.dispose();helm.dispose();releaseRendererTextures();model.dispose();wake.dispose();loading.dispose();bridge.dispose();incidentView.dispose();trafficView.dispose();audio.dispose();env.dispose();ocean.dispose();renderer.dispose();renderer.forceContextLoss();unmount();previous?.focus();};
 const hourSelect=root.querySelector<HTMLSelectElement>('[data-hour]')!,savedHour=navigation.hour.toFixed(2);hourSelect.add(new Option(Math.floor(navigation.hour).toString().padStart(2,'0')+':'+Math.floor(navigation.hour%1*60).toString().padStart(2,'0'),savedHour));hourSelect.value=savedHour;root.querySelector<HTMLInputElement>('[data-day-cycle]')!.checked=navigation.dayCycle;applyQuality();frame=requestAnimationFrame(render);canvas.focus();
 return {pause:()=>{pause();helm.setEnabled(false);audio.setPaused(true);},resume:()=>{navigation.collision='';navigation.running=true;helm.setEnabled(!navigation.service.immobilized&&!navigation.dynamics.plant.shore);last=performance.now();audio.setPaused(false);canvas.focus();},dispose:()=>dispose()};
}
