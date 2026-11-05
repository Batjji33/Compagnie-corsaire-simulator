import { rendererLifetime } from '../world/RendererLifetime';
import { AmbientLight, Color, DirectionalLight, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BrittanySaintMaloModel } from '../ships/BrittanySaintMaloModel';
import { BRITTANY_SAINT_MALO, COMPANIES } from '../ships/companies';

/** On-demand inspection only: no physics, mission, saved-game or port state is changed. */
export function inspectBrittanyFerry():void {
  const previous=document.activeElement as HTMLElement|null;
  const dialog=document.createElement('dialog');dialog.className='ferry-inspector';
  dialog.setAttribute('aria-labelledby','ferry-title');
  const ship=COMPANIES.brittany.ships[0],d=BRITTANY_SAINT_MALO;
  dialog.innerHTML=`<header><div><h2 id="ferry-title">${COMPANIES.brittany.name} · ${ship.name}</h2><p>${d.length.toLocaleString('fr-FR')} × ${d.beam.toLocaleString('fr-FR')} m · Tirant d’eau ${d.draft.toLocaleString('fr-FR')} m</p></div><button data-close>Fermer</button></header><canvas aria-label="Modèle 3D du ferry Saint-Malo" tabindex="0"></canvas><nav aria-label="Inspection du navire"><button data-view="perspective">Vue générale</button><button data-view="profile">Profil</button><button data-view="bow">Proue</button><button data-view="stern">Poupe</button><button data-view="top">Ponts</button><button data-zoom="0.8">Rapprocher</button><button data-zoom="1.25">Éloigner</button><label><input type="checkbox" data-cut> Coupe intérieure</label><label><input type="checkbox" data-ramp> Rampes ouvertes</label></nav><p class="ferry-note">Glisser pour tourner · Pincer pour zoomer · Intérieurs et détails non documentés approximatifs. Modèle d’étude, inspection uniquement.</p><p data-error role="status" hidden></p>`;
  document.body.append(dialog);dialog.showModal();
  const canvas=dialog.querySelector('canvas')!;
  let renderer:WebGLRenderer;
  try {renderer=new WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});} catch {
    dialog.querySelector<HTMLElement>('[data-error]')!.hidden=false;
    dialog.querySelector('[data-error]')!.textContent='Le rendu WebGL est indisponible sur cet appareil.';
    dialog.querySelector('[data-close]')!.addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{dialog.remove();previous?.focus();},{once:true});return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  const scene=new Scene();scene.background=new Color(0xc5d4db);
  scene.add(new AmbientLight(0xffffff,2));
  const sun=new DirectionalLight(0xfff8ed,3);sun.position.set(-90,150,-100);scene.add(sun);
  const model=new BrittanySaintMaloModel();const releaseRendererTextures=rendererLifetime(model.exterior);scene.add(model.root);
  const camera=new PerspectiveCamera(40,1,.2,1500);
  const controls=new OrbitControls(camera,canvas);controls.minDistance=10;controls.maxDistance=650;controls.target.set(0,13,0);
  const render=()=>renderer.render(scene,camera);
  const views:Record<string,[number,number,number]>={perspective:[-150,80,-155],profile:[-190,16,0],bow:[0,40,-300],stern:[0,45,300],top:[0,330,.01]};
  const view=(name:string)=>{controls.target.set(0,13,0);camera.position.set(...views[name]);if(camera.aspect<1)camera.position.multiplyScalar(1.6);controls.update();render();};
  let lastAspect=1;
  const resize=()=>{const {width,height}=canvas.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;if(camera.aspect<lastAspect)camera.position.sub(controls.target).multiplyScalar(lastAspect/camera.aspect).clampLength(10,650).add(controls.target);lastAspect=camera.aspect;camera.updateProjectionMatrix();render();};
  const observer=new ResizeObserver(resize);observer.observe(canvas);
  controls.addEventListener('change',render);
  dialog.addEventListener('keydown',e=>e.stopPropagation());
  dialog.addEventListener('click',event=>{
    const button=(event.target as HTMLElement).closest('button');if(!button)return;
    if(button.hasAttribute('data-close'))dialog.close();
    if(button.dataset.view)view(button.dataset.view);
    if(button.dataset.zoom){camera.position.sub(controls.target).multiplyScalar(Number(button.dataset.zoom)).clampLength(10,650).add(controls.target);controls.update();render();}
  });
  dialog.addEventListener('change',()=>{model.setCutaway(dialog.querySelector<HTMLInputElement>('[data-cut]')!.checked);model.setRamps(dialog.querySelector<HTMLInputElement>('[data-ramp]')!.checked);render();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();const error=dialog.querySelector<HTMLElement>('[data-error]')!;error.hidden=false;error.textContent='Contexte graphique perdu. Fermez puis rouvrez cette inspection.';});
  dialog.addEventListener('close',()=>{observer.disconnect();controls.dispose();releaseRendererTextures();model.dispose();renderer.dispose();renderer.forceContextLoss();dialog.remove();previous?.focus();},{once:true});
  resize();view('perspective');dialog.querySelector<HTMLButtonElement>('[data-close]')!.focus();
}
