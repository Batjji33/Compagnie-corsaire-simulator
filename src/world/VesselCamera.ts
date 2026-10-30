import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Vessel } from '../ships/Vessel';
import { BOAT } from '../ships/parameters';
export type CameraMode='external'|'cockpit'|'explore';
/** Follows hull heave while keeping the horizon free of roll and pitch. */
export class VesselCamera {
  mode:CameraMode='external';
  private previous=new Vector3();
  private offset=new Vector3();
  private look=new Vector3();
  constructor(private camera:PerspectiveCamera,private controls:OrbitControls,private vessel:Vessel) {
    camera.add(vessel.model.cockpit);this.setMode('external');
  }
  setMode(mode:CameraMode):void {
    this.mode=mode;this.vessel.model.setCockpit(mode==='cockpit');
    this.controls.enabled=mode!=='cockpit';this.controls.enablePan=mode==='explore';
    this.controls.minDistance=mode==='external'?BOAT.camera.minDistance:25;
    this.controls.maxDistance=mode==='external'?BOAT.camera.maxDistance:4800;
    this.camera.fov=mode==='cockpit'?65:55;this.camera.updateProjectionMatrix();
    const s=this.vessel.visual,y=this.vessel.root.position.y;this.previous.set(s.x,y,s.z);
    if(mode==='external') {
      this.controls.target.set(s.x,2.5+y,s.z);
      this.offset.set(-BOAT.camera.externalDistance*.7,16,BOAT.camera.externalDistance).applyAxisAngle(new Vector3(0,1,0),-s.heading);
      this.camera.position.copy(this.controls.target).add(this.offset);this.controls.update();
    }
    if(mode==='cockpit')this.update(0);
  }
  update(dt:number):void {
    const s=this.vessel.visual;
    if(this.mode==='external') {
      this.offset.set(s.x,this.vessel.root.position.y,s.z).sub(this.previous);
      this.camera.position.add(this.offset);this.controls.target.add(this.offset);
      this.previous.set(s.x,this.vessel.root.position.y,s.z);this.controls.update(dt);
      const water=this.vessel.water.height(this.camera.position.x,this.camera.position.z,this.vessel.waterOffset)+this.vessel.marine.tide;
      this.camera.position.y=Math.max(2.8+water,this.camera.position.y);
    } else if(this.mode==='cockpit') {
      this.camera.position.set(s.x+Math.sin(s.heading)*BOAT.camera.cockpitForward,BOAT.camera.cockpitHeight+this.vessel.root.position.y+Math.sin(this.vessel.model.root.rotation.x)*BOAT.camera.cockpitForward,s.z-Math.cos(s.heading)*BOAT.camera.cockpitForward);
      this.look.set(this.camera.position.x+Math.sin(s.heading)*100,this.camera.position.y-.6,this.camera.position.z-Math.cos(s.heading)*100);
      this.camera.lookAt(this.look);
    }
  }
  zoom(factor:number):void {
    if(this.mode==='cockpit') {this.camera.fov=MathUtils.clamp(this.camera.fov*factor,45,80);this.camera.updateProjectionMatrix();}
    else {this.camera.position.sub(this.controls.target).multiplyScalar(factor).clampLength(this.controls.minDistance,this.controls.maxDistance).add(this.controls.target);this.controls.update();}
  }
}
