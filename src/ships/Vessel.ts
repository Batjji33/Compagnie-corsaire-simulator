import { Group } from 'three';
import { VesselDynamics } from '../physics/VesselDynamics';
import type { VesselState } from '../physics/VesselDynamics';
import { CorsaireModel } from './CorsaireModel';
import { BOAT } from './parameters';
import { ShoreContact } from '../physics/ShoreContact';

export class Vessel {
  readonly dynamics=new VesselDynamics();
  readonly model=new CorsaireModel();
  readonly root=new Group();
  readonly contact=new ShoreContact();
  readonly visual:VesselState={...this.dynamics.state};
  constructor(){this.root.add(this.model.root);this.root.name='Navire pilotable';}
  update(dt:number):void {this.dynamics.step(dt,this.contact.evaluate(this.dynamics.state));}
  render(time:number,alpha:number):void {
    const s=this.dynamics.interpolate(alpha,this.visual);
    this.root.position.set(s.x,0,s.z);this.root.rotation.y=-s.heading;
    const wave=time*.85+s.x*.016+s.z*.021;
    this.model.root.position.y=BOAT.motion.heave*Math.sin(wave);
    this.model.root.rotation.x=BOAT.motion.pitch*Math.sin(wave*.81+.8);
    this.model.root.rotation.z=BOAT.motion.roll*Math.sin(wave*.73)+Math.max(-.025,Math.min(.025,-s.yawRate*s.surge*.02));
    this.model.updateWheel(s.rudder);
    if(this.model.cockpit.visible)this.model.updateInstruments(s);
  }
  dispose():void {this.model.dispose();}
}
