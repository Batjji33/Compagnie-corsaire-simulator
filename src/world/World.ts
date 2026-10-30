import { ACESFilmicToneMapping, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer, Vector3, TOUCH } from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG } from '../config';
import type { Quality } from '../config';
import { createDaylight, sunDirection } from '../weather/daylight';
import { Ocean } from './Ocean';
import { BayEnvironment } from './BayEnvironment';
import { BAY, groundHeight, VIEWS } from './geography';
import type { ViewId } from './geography';
import { Vessel } from '../ships/Vessel';
import { VesselCamera } from './VesselCamera';
import type { CameraMode } from './VesselCamera';
import { Traffic } from '../traffic/Traffic';
import { TrafficView } from './TrafficView';
import { Passengers } from '../passengers/Passengers';
import { PassengerView } from './PassengerView';

export class World {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(CONFIG.camera.fov, 1, CONFIG.camera.near, CONFIG.camera.far);
  readonly renderer: WebGLRenderer;
  readonly controls: OrbitControls;
  private ocean: Ocean;
  private daylight=createDaylight();
  private sky = new Sky();
  private quality: Quality;
  private environment: BayEnvironment;
  private lastTarget = new Vector3();
  readonly vessel:Vessel;
  readonly vesselCamera:VesselCamera;
  readonly traffic=new Traffic();
  readonly passengers=new Passengers();
  private trafficView:TrafficView;
  private passengerView:PassengerView;
  constructor(readonly canvas: HTMLCanvasElement, quality: Quality) {
    const context = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'low-power' });
    if (!context) throw new Error('WebGL 2 est indisponible. Vérifiez les mises à jour de Safari/iPadOS ou essayez un navigateur compatible.');
    this.quality = quality;
    this.renderer = new WebGLRenderer({ canvas, context, antialias: false });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85;
    const daylight = this.daylight;
    this.scene.add(daylight.sun, daylight.ambient);
    this.scene.fog = daylight.fog;
    this.sky.scale.setScalar(15000);
    this.sky.material.uniforms.sunPosition.value.copy(sunDirection);
    this.sky.material.uniforms.turbidity.value = 3.5;
    this.sky.material.uniforms.rayleigh.value = 1.5;
    this.scene.add(this.sky);
    this.ocean = new Ocean(quality);
    this.scene.add(this.ocean.mesh);
    this.environment = new BayEnvironment(quality);
    this.scene.add(this.environment.root);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = false;
    this.controls.touches.TWO = TOUCH.DOLLY_PAN;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = BAY.minCameraDistance;
    this.controls.maxDistance = BAY.maxCameraDistance;
    this.controls.minPolarAngle = Math.PI * 0.12;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.vessel=new Vessel();this.scene.add(this.vessel.root,this.camera);
    this.vesselCamera=new VesselCamera(this.camera,this.controls,this.vessel);
    this.traffic.limit=quality==='low'?6:8;
    this.trafficView=new TrafficView(this.traffic);this.scene.add(this.trafficView.root);
    this.passengerView=new PassengerView(this.vessel,this.passengers);this.scene.add(this.passengerView.quay);
  }
  resetCamera(): void {
    this.setCameraMode('external');
  }
  setCameraMode(mode:CameraMode):void {
    this.vesselCamera.setMode(mode);
  }
  setView(id: ViewId): void {
    this.setCameraMode('explore');
    this.controls.reset();
    this.camera.position.fromArray(VIEWS[id].position);
    this.controls.target.fromArray(VIEWS[id].target);
    this.controls.update();
    this.lastTarget.copy(this.controls.target);
  }
  move(forward: number, right: number): void {
    if(this.vesselCamera.mode!=='explore')return;
    const direction = this.controls.target.clone().sub(this.camera.position); direction.y=0; direction.normalize();
    const side = new Vector3(-direction.z,0,direction.x);
    const shift=direction.multiplyScalar(forward).addScaledVector(side,right);
    this.camera.position.add(shift); this.controls.target.add(shift);
  }
  zoom(factor: number): void {
    this.vesselCamera.zoom(factor);
  }
  setQuality(quality: Quality): void { this.quality = quality; this.traffic.limit=quality==='low'?6:8;this.ocean.setQuality(quality); this.environment.setQuality(quality); this.resize(); }
  resize(): void {
    const { width, height } = this.canvas.getBoundingClientRect();
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, CONFIG.quality[this.quality].pixelRatio));
    this.renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }
  update(dt:number):void {
    const v=this.vessel,m=v.marine;
    this.traffic.update(dt,v.dynamics.state,m.hour,m.waves,m.visibility);
    v.update(dt,this.traffic.contacts(v.dynamics.state));
    if(!m.warning&&this.traffic.risk)m.warning=`Trafic : ${this.traffic.risk.name} · croisement à surveiller`;
  }
  render(dt: number, time: number, alpha=1): void {
    this.vessel.render(time,alpha);
    this.trafficView.root.visible=this.traffic.enabled;
    this.trafficView.render(this.vessel.marine.tide,time,this.camera.position);
    this.passengerView.render(dt,time);
    const m=this.vessel.marine,light=m.daylight;
    this.daylight.sun.intensity=2.4*light;this.daylight.ambient.intensity=.65+1.05*light;
    const angle=(m.hour-6)/24*Math.PI*2;
    sunDirection.set(Math.cos(angle),Math.sin(angle),.3).normalize();
    this.daylight.sun.position.copy(sunDirection).multiplyScalar(1000);
    this.sky.material.uniforms.sunPosition.value.copy(sunDirection);
    this.daylight.fog.color.setRGB(.035+.42*light,.045+.54*light,.07+.57*light);
    this.daylight.fog.near=m.visibility*.12;this.daylight.fog.far=m.visibility;
    this.ocean.material.uniforms.uFog.value.copy(this.daylight.fog.color);
    this.ocean.material.uniforms.uFogNear.value=this.daylight.fog.near;
    this.ocean.material.uniforms.uFogFar.value=m.visibility;
    this.ocean.material.uniforms.uAmplitude.value=m.waves/3;
    this.ocean.material.uniforms.uLight.value=light;
    this.renderer.toneMappingExposure=.55+.30*light;
    if(this.vesselCamera.mode==='explore') {
      this.controls.update(dt);
    this.lastTarget.copy(this.controls.target);
    this.controls.target.x=Math.max(BAY.minX+500,Math.min(BAY.maxX-500,this.controls.target.x));
    this.controls.target.z=Math.max(BAY.minZ+500,Math.min(BAY.maxZ-500,this.controls.target.z));
    this.lastTarget.subVectors(this.controls.target,this.lastTarget);
    this.camera.position.add(this.lastTarget);
    this.camera.position.y=Math.max(groundHeight(this.camera.position.x,this.camera.position.z)+8,this.camera.position.y);
    } else this.vesselCamera.update(dt);
    this.environment.update(this.camera.position,time);
    this.ocean.update(time, this.camera.position);
    this.ocean.mesh.position.y=m.tide;
    this.renderer.render(this.scene, this.camera);
  }
  dispose(): void {
    this.controls.dispose(); this.ocean.dispose(); this.environment.dispose();this.trafficView.dispose();this.passengerView.dispose(); this.vessel.dispose();
    this.sky.geometry.dispose(); this.sky.material.dispose(); this.renderer.dispose();
  }
}
