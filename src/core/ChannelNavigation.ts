import { CHANNEL_LENGTH, ferryContact, CHANNEL_BERTHS, navigationZone, routePose } from '../world/ChannelGeography.ts';
import { FerryDynamics } from '../physics/FerryDynamics.ts';
import { ChannelTraffic } from '../traffic/ChannelTraffic.ts';
import { IncidentEngine } from '../incidents/IncidentEngine.ts';
import type { IncidentContext } from '../incidents/definitions.ts';
import { KNOT } from '../ships/parameters.ts';
/** Legacy guided reconnaissance plus a separately powered, ferry-only manual simulation. */
export class ChannelNavigation {
 readonly incidents=new IncidentEngine();
 readonly traffic=new ChannelTraffic();
 readonly dynamics=new FerryDynamics(routePose(0));
 distance=0;
 requestedRate=1;
 running=false;
 guided=true;
 collision='';

 get canCharge():boolean {
  const s=this.state,c=this.dynamics.command,e=this.dynamics.environment;
  const current=e.currentKnots*KNOT,angle=e.currentTo*Math.PI/180;
  const groundSpeed=Math.hypot(Math.sin(s.heading)*s.surge+Math.cos(s.heading)*s.sway+Math.sin(angle)*current,-Math.cos(s.heading)*s.surge+Math.sin(s.heading)*s.sway-Math.cos(angle)*current);
  return !this.incidents.modifiers.portBlocked&&!this.guided&&CHANNEL_BERTHS.some(b=>Math.hypot(s.x-b.point[0],s.z-b.point[1])<100&&Math.abs(Math.atan2(Math.sin(s.heading-b.heading),Math.cos(s.heading-b.heading)))<Math.PI/12)&&Math.hypot(s.surge,s.sway)<.15&&groundSpeed<.15&&Math.abs(this.dynamics.bowActual)<.02&&Math.abs(s.yawRate)<.001&&Math.abs(c.port)+Math.abs(c.starboard)+Math.abs(this.dynamics.bowCommand)<.01&&Math.abs(s.port)+Math.abs(s.starboard)<.02;
 }
 toggleCharge():boolean {const p=this.dynamics.plant;if(p.shore){p.shore=false;return true;}if(!this.canCharge)return false;p.shore=true;return true;}
 get incidentContext():IncidentContext {const s=this.state,e=this.dynamics.weather,p=this.dynamics.plant;return {x:s.x,z:s.z,zone:this.zone,speed:Math.max(Math.abs(s.surge),this.dynamics.groundSpeed),wind:e.windKnots,waves:e.waves,traffic:this.traffic.agents.filter(a=>a.active&&Math.hypot(a.x-s.x,a.z-s.z)<2500).length,risk:!!this.traffic.risk,thermalKW:p.thermalKW,soc:p.soc,shore:p.shore};}
 get state(){return this.dynamics.state;}
 get zone(){return navigationZone(this.state.x,this.state.z);}
 get rate(){return this.guided?Math.min(this.requestedRate,this.zone==='port'?4:this.zone==='approach'?16:128):Math.max(1,Math.min(8,this.requestedRate));}
 private pose(distance:number){const p=routePose(distance),before=routePose(distance-60),after=routePose(distance+60);p.heading=Math.atan2(after.x-before.x,before.z-after.z);return p;}
 advance(realDt:number):void {
  if(!this.running)return;
  // Bounded steps: no accelerated movement can jump through a pier or coast.
  let remaining=Math.min(.1,Math.max(0,realDt))*this.rate;
  while(remaining>1e-8){const dt=Math.min(remaining,.1);remaining-=dt;
   const old={...this.state};if(!this.guided)this.traffic.update(dt,this.state);
   if(this.guided){
    const speed=(this.zone==='port'?8:this.zone==='approach'?16:23)*KNOT;
    const next=Math.min(CHANNEL_LENGTH,this.distance+speed*dt),p=this.pose(next);
    const hit=ferryContact(p.x,p.z,p.heading);
    if(hit){this.collision=hit;this.running=false;return;}
    this.distance=next;Object.assign(this.state,p,{surge:speed,sway:0,yawRate:0});
    if(next===CHANNEL_LENGTH){this.state.surge=0;this.running=false;}
   }else{
    this.incidents.step(dt,this.incidentContext);const effects=this.incidents.modifiers;
    this.dynamics.plant.thermalHealth=effects.thermal;this.dynamics.plant.electricHealth=effects.electric;this.dynamics.stormBoost=effects.storm;
    if(effects.portBlocked)this.dynamics.plant.shore=false;
    if(effects.trafficAssistance)this.traffic.horn(this.state);
    this.dynamics.step(dt);const s=this.state,hit=ferryContact(s.x,s.z,s.heading)??this.traffic.contact(s);
    if(hit){Object.assign(s,old,{surge:0,sway:0,yawRate:0});this.dynamics.setCommand({port:0,starboard:0,rudder:0});this.dynamics.bowCommand=0;this.dynamics.groundSpeed=0;this.collision=hit;this.running=false;return;}
   }
  }
 }
 takeHelm():void {this.guided=false;this.requestedRate=1;this.running=false;this.dynamics.restore({...this.state},{port:0,starboard:0,rudder:0});}
}
