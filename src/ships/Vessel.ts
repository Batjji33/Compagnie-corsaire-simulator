import { Marine } from '../weather/Marine';
import { Group } from 'three';
import { VesselDynamics } from '../physics/VesselDynamics';
import type { VesselState } from '../physics/VesselDynamics';
import { CorsaireModel } from './CorsaireModel';
import { ShoreContact } from '../physics/ShoreContact';
import type { TrafficContact } from '../traffic/Traffic';
import { WaveField } from '../weather/Waves';
import { BOAT, clamp } from './parameters';

export class Vessel {
  moored=false;
  readonly marine=new Marine();
  readonly dynamics=new VesselDynamics();
  readonly model=new CorsaireModel();
  readonly root=new Group();
  readonly contact=new ShoreContact();
  readonly visual:VesselState={...this.dynamics.state};
  readonly water=new WaveField();
  readonly flotation={heave:0,pitch:0,roll:0};
  waterOffset=0;
  constructor(){this.root.add(this.model.root);this.root.name='Navire pilotable';}
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
    this.water.hull(s.x,s.z,s.heading,BOAT.length,BOAT.beam,this.waterOffset,this.flotation);
    this.root.position.set(s.x,this.marine.tide+this.flotation.heave,s.z);this.root.rotation.y=-s.heading;
    this.model.root.position.y=0;
    this.model.root.rotation.x=clamp(this.flotation.pitch,-.25,.25);
    this.model.root.rotation.z=clamp(this.flotation.roll,-.35,.35)+clamp(-s.yawRate*s.surge*.02,-.025,.025);
    this.model.updateWheel(s.rudder);
    if(this.model.cockpit.visible)this.model.updateInstruments(s,this.dynamics.powerFactor);
  }
  dispose():void {this.model.dispose();}
}
