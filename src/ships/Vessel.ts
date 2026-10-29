import { Marine } from '../weather/Marine';
import { Group } from 'three';
import { VesselDynamics } from '../physics/VesselDynamics';
import type { VesselState } from '../physics/VesselDynamics';
import { CorsaireModel } from './CorsaireModel';
import { ShoreContact } from '../physics/ShoreContact';

export class Vessel {
  moored=false;
  readonly marine=new Marine();
  readonly dynamics=new VesselDynamics();
  readonly model=new CorsaireModel();
  readonly root=new Group();
  readonly contact=new ShoreContact();
  readonly visual:VesselState={...this.dynamics.state};
  constructor(){this.root.add(this.model.root);this.root.name='Navire pilotable';}
  update(dt:number):void {
    const m=this.marine,s=this.dynamics.state;m.update(dt);
    if(this.moored){
      this.dynamics.reset({x:s.x,z:s.z,heading:s.heading});
      m.hazards(s,'',0,dt);return;
    }
    const contact=this.contact.evaluate(s),weather=m.forces(s);
    const grounded=m.hazards(s,this.contact.label,this.contact.impactSpeed,dt);
    this.dynamics.powerFactor=m.performance;
    this.dynamics.step(dt,{x:contact.x+weather.x,z:contact.z+weather.z,yaw:contact.yaw+weather.yaw});
    if(grounded){s.surge*=Math.exp(-dt*3);s.sway*=Math.exp(-dt*3);s.yawRate*=Math.exp(-dt*2);}
  }
  render(time:number,alpha:number):void {
    const s=this.dynamics.interpolate(alpha,this.visual);
    this.root.position.set(s.x,this.marine.tide,s.z);this.root.rotation.y=-s.heading;
    const wave=time*.85+s.x*.016+s.z*.021;
    this.model.root.position.y=this.marine.waves*.22*Math.sin(wave);
    this.model.root.rotation.x=this.marine.waves*.018*Math.sin(wave*.81+.8);
    this.model.root.rotation.z=this.marine.waves*.035*Math.sin(wave*.73)+Math.max(-.025,Math.min(.025,-s.yawRate*s.surge*.02));
    this.model.updateWheel(s.rudder);
    if(this.model.cockpit.visible)this.model.updateInstruments(s,this.dynamics.powerFactor);
  }
  dispose():void {this.model.dispose();}
}
