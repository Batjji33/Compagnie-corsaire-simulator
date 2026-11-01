import { AmbientLight, Color, DirectionalLight, Fog, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BrittanySaintMaloModel } from '../ships/BrittanySaintMaloModel';
import { ChannelEnvironment,CHANNEL_FOG } from '../world/ChannelEnvironment';
import { CHANNEL_LENGTH,routePose,channelDepth,unproject } from '../world/ChannelGeography';
import { Ocean } from '../world/Ocean';
import { WaveField } from '../weather/Waves';
import { ChannelNavigation } from '../core/ChannelNavigation';
import { ChannelChart } from './ChannelChart';

export function openChannelVoyage(north=false):void{
 if(document.querySelector('.channel-voyage'))return;
 const previous=document.activeElement as HTMLElement|null,dialog=document.createElement('dialog');dialog.className='channel-voyage ferry-inspector';dialog.setAttribute('aria-labelledby','channel-title');
 dialog.innerHTML=`<header><div><h2 id="channel-title">Saint-Malo → Portsmouth</h2><p>Reconnaissance de la Manche · Brittany Ferries</p></div><button data-close>Fermer</button></header><div class="channel-views"><canvas data-scene tabindex="0" aria-label="Navigation 3D dans la Manche"></canvas><aside><canvas data-chart role="img"></canvas><button data-map>Afficher le radar côtier</button><output data-gps></output><output data-status aria-live="polite"></output></aside></div><nav aria-label="Navigation"><button data-run>Démarrer la traversée</button><label>Temps<select data-rate><option value="1">×1</option><option value="4">×4</option><option value="16">×16</option><option value="128">×128 au large</option></select></label><button data-helm>Prendre la barre</button><button data-camera>Recentrer la caméra</button></nav><div data-manual hidden><label>Moteurs<input data-power type="range" min="-1" max="1" step="0.1" value="0"></label><label>Gouvernail<input data-rudder type="range" min="-1" max="1" step="0.05" value="0"></label></div><p class="ferry-note">Itinéraire de jeu sans escale obligatoire. Temps limité près des ports. Carte, balisage, profondeurs et conduite simplifiés : inutilisables pour la navigation réelle. Fond régional : Natural Earth, domaine public.</p><p data-error hidden role="alert"></p>`;
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
 const model=new BrittanySaintMaloModel();scene.add(model.root);
 const env=new ChannelEnvironment();scene.add(env.root);
 const water=new WaveField(),ocean=new Ocean('low',water,70000);scene.add(ocean.mesh);ocean.material.uniforms.uFog.value.copy(scene.background);ocean.material.uniforms.uFogNear.value=7000;ocean.material.uniforms.uFogFar.value=CHANNEL_FOG;
 const navigation=new ChannelNavigation(),chart=new ChannelChart(dialog.querySelector('[data-chart]')!);
 if(north){navigation.distance=CHANNEL_LENGTH-6000;navigation.dynamics.reset(routePose(navigation.distance));}
 const run=dialog.querySelector<HTMLButtonElement>('[data-run]')!,status=dialog.querySelector<HTMLOutputElement>('[data-status]')!,gps=dialog.querySelector<HTMLOutputElement>('[data-gps]')!;
 const resize=()=>{const r=canvas.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();};
 const observer=new ResizeObserver(resize);observer.observe(canvas);
 const abort=new AbortController(),options={signal:abort.signal};let frame=0,last=performance.now(),time=0,uiTime=0,closed=false;
 dialog.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest('button');if(!b)return;
  if(b.hasAttribute('data-close'))dialog.close();
  if(b.hasAttribute('data-run')){navigation.collision='';navigation.running=!navigation.running;}
  if(b.hasAttribute('data-camera'))resetCamera();
  if(b.hasAttribute('data-map')){chart.radar=!chart.radar;b.textContent=chart.radar?'Afficher la carte de la Manche':'Afficher le radar côtier';chart.draw(navigation.state);}
  if(b.hasAttribute('data-helm')){navigation.takeHelm();dialog.querySelector<HTMLElement>('[data-manual]')!.hidden=false;b.disabled=true;}
 },options);
 dialog.querySelector('[data-rate]')!.addEventListener('change',e=>navigation.requestedRate=Number((e.target as HTMLSelectElement).value),options);
 for(const field of ['power','rudder'])dialog.querySelector(`[data-${field}]`)!.addEventListener('input',()=>{const power=Number(dialog.querySelector<HTMLInputElement>('[data-power]')!.value),rudder=Number(dialog.querySelector<HTMLInputElement>('[data-rudder]')!.value);navigation.dynamics.setCommand({port:power,starboard:power,rudder});},options);
 const pause=()=>{navigation.running=false;last=performance.now();};document.addEventListener('visibilitychange',pause,options);
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();pause();cancelAnimationFrame(frame);const error=dialog.querySelector<HTMLElement>('[data-error]')!;error.hidden=false;error.textContent='Contexte WebGL perdu. Fermez puis rouvrez la reconnaissance.';},options);
 function render(now:number){if(closed)return;frame=requestAnimationFrame(render);if(document.hidden){last=now;return;}if(now-last<32)return;
  const dt=Math.min(.1,(now-last)/1000);last=now;navigation.advance(dt);time+=dt;uiTime+=dt;
  const s=navigation.state;water.update(dt,{waves:.6,wind:10,direction:250});
  // Double precision geographic state; all rendered objects remain near the vessel origin.
  env.root.position.set(-s.x,0,-s.z);env.update(s.x,s.z,time);
  model.root.position.set(0,water.height(s.x,s.z),0);model.root.rotation.y=-s.heading;
  ocean.update(time,s,water,0,0,.6,s,s);controls.update();renderer.render(scene,camera);
  if(uiTime>.2){uiTime=0;chart.draw(s);const geo=unproject(s.x,s.z);gps.textContent=`GPS de jeu ${geo.lat.toFixed(4)}° N · ${Math.abs(geo.lon).toFixed(4)}° O\n${(s.surge*3600/1852).toFixed(1)} nd · fond fictif ${channelDepth(s.x,s.z)} m`;
   status.textContent=navigation.collision?`Arrêt avant obstacle : ${navigation.collision}`:navigation.distance>=CHANNEL_LENGTH?'Arrivée au poste de Portsmouth':`${navigation.zone==='port'?'Zone portuaire':navigation.zone==='approach'?'Approche':'Large'} · temps ×${navigation.rate}${navigation.guided?` · ${(navigation.distance/1852).toFixed(1)} / ${(CHANNEL_LENGTH/1852).toFixed(1)} milles`: ' · conduite approximative'}`;
   run.textContent=navigation.running?'Pause':navigation.distance>=CHANNEL_LENGTH?'Traversée terminée':'Continuer';run.disabled=navigation.guided&&navigation.distance>=CHANNEL_LENGTH;
  }
 }
 dialog.addEventListener('close',()=>{closed=true;cancelAnimationFrame(frame);abort.abort();observer.disconnect();controls.dispose();model.dispose();env.dispose();ocean.dispose();renderer.dispose();renderer.forceContextLoss();dialog.remove();previous?.focus();},{once:true});
 resize();frame=requestAnimationFrame(render);run.focus();
}
