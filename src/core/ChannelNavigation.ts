import { CHANNEL_LENGTH, ferryContact, navigationZone, routePose } from '../world/ChannelGeography.ts';
import { VesselDynamics } from '../physics/VesselDynamics.ts';
import { BOAT, KNOT } from '../ships/parameters.ts';
/** Geography reconnaissance, not a validated Saint-Malo handling model. */
export class ChannelNavigation {
 readonly dynamics=new VesselDynamics(routePose(0));
 distance=0;
 requestedRate=1;
 running=false;
 guided=true;
 collision='';
 constructor(){
  this.dynamics.parameters={...BOAT,length:194.7,beam:27.8,draft:6.6,maxSpeedKnots:23,mass:20_000_000,yawInertia:70_000_000_000,engineThrust:1_000_000,engineArm:9,engineResponse:4,surgeLinearDrag:20000,swayLinearDrag:6_000_000,swayQuadraticDrag:2_000_000,yawLinearDrag:9_000_000_000,yawSpeedDrag:1_000_000_000,yawQuadraticDrag:80_000_000_000,rudderLift:400_000,rudderArm:70};
 }
 get state(){return this.dynamics.state;}
 get zone(){return navigationZone(this.state.x,this.state.z);}
 get rate(){return this.guided?Math.min(this.requestedRate,this.zone==='port'?4:this.zone==='approach'?16:128):1;}
 private pose(distance:number){const p=routePose(distance),before=routePose(distance-60),after=routePose(distance+60);p.heading=Math.atan2(after.x-before.x,before.z-after.z);return p;}
 advance(realDt:number):void {
  if(!this.running)return;
  // Bounded steps: no accelerated movement can jump through a pier or coast.
  let remaining=Math.min(.1,Math.max(0,realDt))*this.rate;
  while(remaining>1e-8){const dt=Math.min(remaining,.1);remaining-=dt;
   const old={...this.state};
   if(this.guided){
    const speed=(this.zone==='port'?8:this.zone==='approach'?16:23)*KNOT;
    const next=Math.min(CHANNEL_LENGTH,this.distance+speed*dt),p=this.pose(next);
    const hit=ferryContact(p.x,p.z,p.heading);
    if(hit){this.collision=hit;this.running=false;return;}
    this.distance=next;Object.assign(this.state,p,{surge:speed,sway:0,yawRate:0});
    if(next===CHANNEL_LENGTH){this.state.surge=0;this.running=false;}
   }else{
    this.dynamics.step(dt);const s=this.state,hit=ferryContact(s.x,s.z,s.heading);
    if(hit){Object.assign(s,old,{surge:0,sway:0,yawRate:0});this.dynamics.setCommand({port:0,starboard:0,rudder:0});this.collision=hit;this.running=false;return;}
   }
  }
 }
 takeHelm():void {this.guided=false;this.requestedRate=1;this.running=false;this.dynamics.restore({...this.state},{port:0,starboard:0,rudder:0});}
}
