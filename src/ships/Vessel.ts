import { Marine } from '../weather/Marine';
import { Group } from 'three';
import { VesselDynamics } from '../physics/VesselDynamics';
import type { VesselState } from '../physics/VesselDynamics';
import { CorsaireModel } from './CorsaireModel';
import { ShoreContact } from '../physics/ShoreContact';
import type { TrafficContact } from '../traffic/Traffic';
import { WaveField } from '../weather/Waves';
import { SHIPS, clamp } from './parameters';
import type { BoatParameters, ShipId } from './parameters';
import { SaintMaloModel } from './SaintMaloModel';

export class Vessel {
  moored=false;
  readonly marine=new Marine();
  readonly dynamics=new VesselDynamics();
  model:CorsaireModel|SaintMaloModel=new CorsaireModel();
  shipId:ShipId='emeraude';
  get parameters():BoatParameters {return SHIPS[this.shipId].parameters;}
  readonly root=new Group();
  readonly contact=new ShoreContact();
  readonly visual:VesselState={...this.dynamics.state};
  readonly water=new WaveField();
  readonly flotation={heave:0,pitch:0,roll:0};
  waterOffset=0;
  constructor(){this.root.add(this.model.root);this.root.name='Navire pilotable';}
  selectShip(id:ShipId):void {
    if(id===this.shipId)return;
    this.model.cockpit.removeFromParent();this.model.root.removeFromParent();this.model.dispose();
    this.shipId=id;this.model=id==='saint-malo'?new SaintMaloModel():new CorsaireModel();this.root.add(this.model.root);
    this.dynamics.parameters=this.marine.parameters=this.contact.parameters=this.parameters;
    this.dynamics.reset();this.flotation.heave=this.flotation.pitch=this.flotation.roll=0;
  }
  update(dt:number,traffic?:TrafficContact):void {
    const m=this.marine,s=this.dynamics.state;m.update(dt);this.water.update(dt,m);
    if(this.moored){
      this.dynamics.reset({x:s.x,z:s.z,heading:s.heading});
      m.hazards(s,'',0,dt);return;
    }
    const contact=this.contact.evaluate(s),weather=m.forces(s);
    this.contact.label ||= traffic?.label??'';
    const grounded=m.hazards(s,this.contact.label,Math.max(this.contact.impactSpeed,traffic?.impact??0),dt);
    this.dynamics.powerFactor=m.performance;
    this.dynamics.step(dt,{x:contact.x+weather.x+(traffic?.x??0),z:contact.z+weather.z+(traffic?.z??0),yaw:contact.yaw+weather.yaw+(traffic?.yaw??0)});
    if(grounded){s.surge*=Math.exp(-dt*3);s.sway*=Math.exp(-dt*3);s.yawRate*=Math.exp(-dt*2);}
  }
  render(_time:number,alpha:number):void {
    const s=this.dynamics.interpolate(alpha,this.visual);
    this.water.update(0,this.marine);this.waterOffset=(clamp(alpha,0,1)-1)/60;
    const boat=this.parameters;
    this.water.hull(s.x,s.z,s.heading,boat.length,boat.beam,this.waterOffset,this.flotation);
    if(this.shipId==='saint-malo'){
      // Four waterline samples on the two hulls, with damped lateral response.
      const sin=Math.sin(s.heading),cos=Math.cos(s.heading),fore=boat.length*.35,side=2.8;
      const at=(f:number,x:number)=>this.water.height(s.x+sin*f+cos*x,s.z-cos*f+sin*x,this.waterOffset);
      const bp=at(fore,-side),bs=at(fore,side),sp=at(-fore,-side),ss=at(-fore,side);
      this.flotation.heave=(bp+bs+sp+ss)/4;
      this.flotation.pitch=Math.atan2(bp+bs-sp-ss,fore*4)*.8;
      this.flotation.roll=Math.atan2(bs+ss-bp-sp,side*4)*.48;
    }
    this.root.position.set(s.x,this.marine.tide+this.flotation.heave,s.z);this.root.rotation.y=-s.heading;
    this.model.root.position.y=0;
    this.model.root.rotation.x=clamp(this.flotation.pitch,-.25,.25);
    this.model.root.rotation.z=clamp(this.flotation.roll,-.35,.35)+clamp(-s.yawRate*s.surge*(this.shipId==='saint-malo'?.008:.02),-.025,.025);
    this.model.updateWheel(s.rudder);
    if(this.model.cockpit.visible)this.model.updateInstruments(s,this.dynamics.powerFactor);
  }
  dispose():void {this.model.dispose();}
}
