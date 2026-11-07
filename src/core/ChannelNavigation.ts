import { CHANNEL_LENGTH, ferryContact, CHANNEL_BERTHS, navigationZone, routePose, routeProgress } from '../world/ChannelGeography.ts';
import { FerryDynamics } from '../physics/FerryDynamics.ts';
import { ChannelTraffic } from '../traffic/ChannelTraffic.ts';
import { IncidentEngine } from '../incidents/IncidentEngine.ts';
import type { IncidentContext } from '../incidents/definitions.ts';
import { ChannelFerryService } from '../missions/ChannelFerryService.ts';
import { WakeTrail } from '../ships/WakeTrail.ts';
import { KNOT } from '../ships/parameters.ts';
/** Legacy guided reconnaissance plus a separately powered, ferry-only manual simulation. */
export class ChannelNavigation {
 readonly wake=new WakeTrail();
 constructor(){this.wake.parameters=this.dynamics.parameters;}
 readonly service=new ChannelFerryService();
 hour=14;dayCycle=true;simTime=0;
 readonly incidents=new IncidentEngine();
 readonly traffic=new ChannelTraffic();
 readonly dynamics=new FerryDynamics(routePose(0));
 distance=0;
 requestedRate=1;
 running=false;
 guided=true;
 collision='';

 initializeVoyage(north:boolean):void {const origin=north?1:0,b=CHANNEL_BERTHS[origin];this.service.initialize(origin);this.dynamics.reset({x:b.point[0],z:b.point[1],heading:b.heading});this.distance=north?CHANNEL_LENGTH:0;this.takeHelm();}
 prepareReturn():boolean {if(this.service.state.phase!=='complete'||this.service.state.ramp>.01)return false;this.service.initialize(this.service.destination);return true;}
 get destination(){return CHANNEL_BERTHS[this.service.destination];}
 get remaining():number{return this.service.state.enabled&&this.service.state.origin===1?this.distance:CHANNEL_LENGTH-this.distance;}
 get canMoor():boolean {const s=this.state,b=this.destination,c=this.dynamics.command,record=this.traffic.berths.ports[this.service.destination===0?'malo':'dinard'];return this.service.state.enabled&&this.service.state.phase==='crossing'&&!this.service.state.moored&&!this.incidents.modifiers.evacuating&&!this.incidents.modifiers.portBlocked&&(!record.owner||record.owner==='player')&&(!record.reserved||record.reserved==='player')&&Math.hypot(s.x-b.point[0],s.z-b.point[1])<35&&Math.abs(Math.atan2(Math.sin(s.heading-b.heading),Math.cos(s.heading-b.heading)))<Math.PI/18&&Math.hypot(s.surge,s.sway)<.7&&this.dynamics.groundSpeed<.2&&Math.abs(s.yawRate)<.001&&Math.abs(c.port)+Math.abs(c.starboard)+Math.abs(this.dynamics.bowCommand)<.01;}
 moor():boolean {if(!this.canMoor)return false;this.service.state.moored=true;this.dynamics.restore({...this.state,surge:0,sway:0,yawRate:0,port:0,starboard:0},{port:0,starboard:0,rudder:0});this.dynamics.bowActual=0;this.dynamics.groundSpeed=0;return true;}
 get canCharge():boolean {
  const s=this.state,c=this.dynamics.command,e=this.dynamics.environment;
  const current=e.currentKnots*KNOT,angle=e.currentTo*Math.PI/180;
  const groundSpeed=this.service.immobilized?0:Math.hypot(Math.sin(s.heading)*s.surge+Math.cos(s.heading)*s.sway+Math.sin(angle)*current,-Math.cos(s.heading)*s.surge+Math.sin(s.heading)*s.sway-Math.cos(angle)*current);
  return !this.incidents.modifiers.portBlocked&&!this.guided&&CHANNEL_BERTHS.some(b=>Math.hypot(s.x-b.point[0],s.z-b.point[1])<100&&Math.abs(Math.atan2(Math.sin(s.heading-b.heading),Math.cos(s.heading-b.heading)))<Math.PI/12)&&Math.hypot(s.surge,s.sway)<.15&&groundSpeed<.15&&Math.abs(this.dynamics.bowActual)<.02&&Math.abs(s.yawRate)<.001&&Math.abs(c.port)+Math.abs(c.starboard)+Math.abs(this.dynamics.bowCommand)<.01&&Math.abs(s.port)+Math.abs(s.starboard)<.02;
 }
 toggleCharge():boolean {const p=this.dynamics.plant;if(p.shore){p.shore=false;return true;}if(!this.canCharge)return false;p.shore=true;return true;}
 get incidentContext():IncidentContext {const s=this.state,e=this.dynamics.weather,p=this.dynamics.plant;return {x:s.x,z:s.z,zone:this.zone,speed:Math.max(Math.abs(s.surge),this.dynamics.groundSpeed),wind:e.windKnots,waves:e.waves,traffic:this.traffic.agents.filter(a=>a.active&&Math.hypot(a.x-s.x,a.z-s.z)<2500).length,risk:!!this.traffic.risk,thermalKW:p.thermalKW,soc:p.soc,shore:p.shore,passengers:this.service.state.enabled?this.service.state.passengers:Math.max(0,420-this.incidents.state.effects.evacuated),underway:!this.service.state.enabled||this.service.state.phase==='crossing'&&!this.service.state.moored};}
 get state(){return this.dynamics.state;}
 get zone(){return navigationZone(this.state.x,this.state.z);}
 get rate(){return this.guided?Math.min(this.requestedRate,this.zone==='port'?4:this.zone==='approach'?16:128):Math.max(1,Math.min(8,this.requestedRate));}
 private pose(distance:number){const p=routePose(distance),before=routePose(distance-60),after=routePose(distance+60);p.heading=Math.atan2(after.x-before.x,before.z-after.z);return p;}
 advance(realDt:number):void {
  if(!this.running)return;
  // Bounded steps: no accelerated movement can jump through a pier or coast.
  let remaining=Math.min(.1,Math.max(0,realDt))*this.rate;
  while(remaining>1e-8){const dt=Math.min(remaining,.1);remaining-=dt;
   this.simTime+=dt;if(this.dayCycle)this.hour=(this.hour+dt/3600)%24;
   const old={...this.state};if(!this.guided)this.traffic.update(dt,this.state);
   if(this.guided){
    const speed=(this.zone==='port'?8:this.zone==='approach'?16:23)*KNOT;
    const next=Math.min(CHANNEL_LENGTH,this.distance+speed*dt),p=this.pose(next);
    const hit=ferryContact(p.x,p.z,p.heading);
    if(hit){this.collision=hit;this.running=false;return;}
    this.distance=next;Object.assign(this.state,p,{surge:speed,sway:0,yawRate:0});
    if(next===CHANNEL_LENGTH){this.state.surge=0;this.running=false;}
   }else{
    const evacuated=this.incidents.state.effects.evacuated;
    this.incidents.step(dt,this.incidentContext);const effects=this.incidents.modifiers;
    this.service.evacuate(this.incidents.state.effects.evacuated-evacuated);
    this.dynamics.plant.thermalHealth=effects.thermal;this.dynamics.plant.electricHealth=effects.electric;this.dynamics.steeringFactor=effects.steering;this.dynamics.stormBoost=effects.storm;
    if(effects.portBlocked)this.dynamics.plant.shore=false;
    if(effects.trafficAssistance)this.traffic.horn(this.state);
    if(this.service.immobilized){this.dynamics.stormBlend+=((effects.storm?1:0)-this.dynamics.stormBlend)*(1-Math.exp(-dt/120));this.dynamics.plant.step(dt,0);this.dynamics.groundSpeed=0;}
    else this.dynamics.step(dt);
    this.service.step(dt,effects.portBlocked,this.state.surge,this.state.yawRate,this.dynamics.weather.waves);
    this.distance=routeProgress(this.state.x,this.state.z);
    this.wake.update(dt,this.simTime,this.state,this.service.immobilized||this.dynamics.plant.shore);
    const s=this.state,hit=ferryContact(s.x,s.z,s.heading)??this.traffic.contact(s);
    if(hit){Object.assign(s,old,{surge:0,sway:0,yawRate:0});this.dynamics.setCommand({port:0,starboard:0,rudder:0});this.dynamics.bowCommand=0;this.dynamics.groundSpeed=0;this.collision=hit;this.running=false;return;}
   }
  }
 }
 takeHelm():void {this.guided=false;this.requestedRate=1;this.running=false;this.dynamics.restore({...this.state},{port:0,starboard:0,rudder:0});}
}
