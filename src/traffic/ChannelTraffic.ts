import { clamp,KNOT } from '../ships/parameters.ts';
import type { VesselState } from '../physics/VesselDynamics.ts';
import { closestApproach } from './Traffic.ts';
import type { TrafficAgent,TrafficRoute,MovingPoint } from './Traffic.ts';
import { Berths } from './Berths.ts';
import { CHANNEL_LENGTH,CHANNEL_BERTHS,channelContact,routePose,project } from '../world/ChannelGeography.ts';
export interface ChannelAgent extends TrafficAgent {yawRate:number;response:number;hornUntil:number;decision:number;phase:'sailing'|'blocked';}
export const CHANNEL_TRAFFIC_PROFILE={cargo:{turn:.003,accel:.025},ferry:{turn:.009,accel:.045},sail:{turn:.045,accel:.12},pleasure:{turn:.075,accel:.22},launch:{turn:.06,accel:.2}} as const;
export function trafficHullClear(x:number,z:number,heading:number,length:number,beam:number):boolean{
 const half=(length-beam)/2;
 for(const f of [-half,0,half])if(channelContact(x+Math.sin(heading)*f,z-Math.cos(heading)*f,beam/2+8))return false;
 return true;
}
export function vesselOverlap(a:{x:number;z:number;heading:number;length:number;beam:number},b:{x:number;z:number;heading:number;length:number;beam:number}):boolean{
 // SAT over oriented full-length hull rectangles: includes the bows of large ships.
 const axes=[[Math.sin(a.heading),-Math.cos(a.heading)],[Math.cos(a.heading),Math.sin(a.heading)],[Math.sin(b.heading),-Math.cos(b.heading)],[Math.cos(b.heading),Math.sin(b.heading)]];
 for(const [x,z] of axes){const extent=(v:typeof a)=>Math.abs(x*Math.sin(v.heading)-z*Math.cos(v.heading))*v.length/2+Math.abs(x*Math.cos(v.heading)+z*Math.sin(v.heading))*v.beam/2;
  if(Math.abs((b.x-a.x)*x+(b.z-a.z)*z)>extent(a)+extent(b))return false;}
 return true;
}
export class ChannelTraffic {
 readonly agents:ChannelAgent[]=[];
 readonly taxis={agents:[] as TrafficAgent[]};
 readonly berths=new Berths(); // Same queue/ownership implementation, isolated from Corsaire ports.
 limit=20;elapsed=0;risk='';private hornReady=0;private riskTime=0;
 constructor(){
  const ellipse=(route:Omit<TrafficRoute,'points'>,cx:number,cz:number,rx:number,rz:number,phase:number)=>{
   const points=Array.from({length:48},(_,i)=>{const a=i/48*Math.PI*2;return [cx+Math.cos(a)*rx,cz+Math.sin(a)*rz] as const;});
   if(!points.every((p,i)=>trafficHullClear(p[0],p[1],Math.atan2(points[(i+1)%48][0]-p[0],p[1]-points[(i+1)%48][1]),route.length,route.beam)))return;
   const preferred=phase%48,index=Array.from({length:48},(_,i)=>(preferred+i)%48).find(i=>this.agents.every(a=>Math.hypot(a.x-points[i][0],a.z-points[i][1])>(a.route.length+route.length)/2+150));if(index===undefined)return;
   const p=points[index],q=points[(index+1)%48],heading=Math.atan2(q[0]-p[0],p[1]-q[1]);
   this.agents.push({route:{...route,points,loop:true},x:p[0],z:p[1],vx:Math.sin(heading)*route.knots*KNOT,vz:-Math.cos(heading)*route.knots*KNOT,heading,speed:route.knots*KNOT,target:(index+1)%48,direction:1,active:true,aiTime:0,desiredHeading:heading,desiredSpeed:route.knots*KNOT,avoiding:false,yawRate:0,response:0,hornUntil:0,decision:0,phase:'sailing'});
  };
  for(let d=12000,i=0;d<CHANNEL_LENGTH-14000;d+=12000,i++){
   const p=routePose(d),side=i%2?1:-1;
   ellipse({id:'channel-large-'+i,name:i%3?'Cargo de la Manche':'Porte-conteneurs du large',kind:i%4===2?'ferry':'cargo',knots:14+i%4,length:i%4===2?180:i%3?220:310,beam:i%4===2?27:38,cargoStyle:i%3?'bulk':'container'},p.x+side*1800,p.z,4000,4000,i*7);
   ellipse({id:'channel-small-'+i,name:i%2?'Plaisancier de la Manche':'Voilier de croisière',kind:i%2?'pleasure':'sail',knots:i%2?8:5,length:i%2?13:16,beam:4.5},p.x-side*1100,p.z,1100,850,i*11);
  }
  const s=project(-1.13,50.763);
  ellipse({id:'solent-ferry',name:'Ferry britannique · Solent',kind:'ferry',length:89.7,beam:19,knots:10},s[0],s[1],1600,500,12);
  const n=project(-1.116,50.805);
  ellipse({id:'harbour-shuttle',name:'Navette britannique · Harbour',kind:'launch',length:20,beam:6,knots:5},n[0],n[1],180,280,20);
  ellipse({id:'malo-pleasure',name:'Plaisance de l?avant-port',kind:'pleasure',length:9,beam:3,knots:4},-250,1350,280,180,7);
  ellipse({id:'malo-launch',name:'Vedette c?ti?re',kind:'launch',length:14,beam:4,knots:5},200,1000,200,150,18);
  ellipse({id:'malo-coast',name:'Voilier des approches de Saint-Malo',kind:'sail',length:12,beam:4,knots:4},-3300,-6500,900,600,12);
 }
 horn(player:VesselState):boolean{
  if(this.elapsed<this.hornReady)return false;this.hornReady=this.elapsed+6;
  for(const a of this.agents){const distance=Math.hypot(a.x-player.x,a.z-player.z);if(distance<1500&&a.route.kind!=='cargo'){a.hornUntil=this.elapsed+12;a.response=a.route.kind==='pleasure'||a.route.kind==='sail'?1:.2;}}
  return true;
 }
 private plan(a:ChannelAgent,player:MovingPoint):void{
  const r=a.route,p=r.points[a.target];if(Math.hypot(a.x-p[0],a.z-p[1])<Math.max(r.length,a.speed*18))a.target=(a.target+1)%r.points.length;
  const q=r.points[a.target];a.desiredHeading=Math.atan2(q[0]-a.x,a.z-q[1]);a.desiredSpeed=r.knots*KNOT;a.avoiding=false;
  const profile=CHANNEL_TRAFFIC_PROFILE[r.kind],large=r.length>100;
  for(const b of [player,...this.agents.filter(b=>b!==a&&Math.hypot(b.x-a.x,b.z-a.z)<5000)]){
   const cpa=closestApproach(a,b,large?180:90),distance=Math.hypot(b.x-a.x,b.z-a.z),other='route' in b?(b as ChannelAgent):undefined;
   const clearance=(r.length+(other?.route.length??194.7))/2+80;
   if(!cpa.closing||cpa.distance>clearance||distance>5000)continue;
   const bearing=Math.atan2(b.x-a.x,a.z-b.z),relative=Math.atan2(Math.sin(bearing-a.heading),Math.cos(bearing-a.heading));
   const headOn=Math.abs(relative)<.2&&Math.cos((other?.heading??Math.atan2(b.vx,-b.vz))-a.heading)<-.7;
   const giveWay=headOn||relative>0&&relative<Math.PI*.65;
   if(giveWay||distance<clearance*1.5){a.desiredHeading+=large?.12:.4;a.desiredSpeed*=large?.85:.65;a.avoiding=true;}
   // Stand-on traffic warns the player instead of always yielding.
   if(!other&&distance<clearance*3)this.risk=r.name+' · rapprochement à anticiper';
  }
  if(a.hornUntil>this.elapsed&&a.response){a.desiredSpeed*=1-a.response*.3;a.desiredHeading+=a.response*.15;}
  const look=Math.max(r.length*2,a.speed*35,a.speed*a.speed/(2*profile.accel)+r.length),tryHeading=(h:number)=>trafficHullClear(a.x+Math.sin(h)*look,a.z-Math.cos(h)*look,h,r.length,r.beam);
  if(!tryHeading(a.desiredHeading)){
   a.avoiding=true;a.desiredSpeed=Math.min(a.desiredSpeed,Math.max(0,a.speed-profile.accel*10));
   for(const offset of [.2,-.2,.4,-.4,.7,-.7])if(tryHeading(a.heading+offset)){a.desiredHeading=a.heading+offset;break;}
  }
 }
 update(dt:number,player:VesselState):void{
  this.elapsed+=dt;this.riskTime-=dt;if(this.riskTime<=0){this.risk='';this.riskTime=2;}
  const pv={x:player.x,z:player.z,vx:Math.sin(player.heading)*player.surge+Math.cos(player.heading)*player.sway,vz:-Math.cos(player.heading)*player.surge+Math.sin(player.heading)*player.sway};
  const ranked=[...this.agents].sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z));
  for(const [i,a] of ranked.entries()){
   const distance=Math.hypot(a.x-player.x,a.z-player.z);if(i<this.limit)a.active=true;else if(distance>26000)a.active=false;
   a.aiTime+=dt;if(distance>8000&&a.aiTime<.5)continue;const step=distance>8000?a.aiTime:dt;a.aiTime=0;
   a.decision-=step;if(a.decision<=0){this.plan(a,pv);a.decision=distance>8000?2:.25;}
   const profile=CHANNEL_TRAFFIC_PROFILE[a.route.kind],delta=Math.atan2(Math.sin(a.desiredHeading-a.heading),Math.cos(a.desiredHeading-a.heading));
   const target=clamp(delta*.05,-profile.turn,profile.turn);a.yawRate+=clamp(target-a.yawRate,-profile.turn*step/12,profile.turn*step/12);
   const heading=a.heading+a.yawRate*step,speed=a.speed+clamp(a.desiredSpeed-a.speed,-profile.accel*step,profile.accel*step);
   const x=a.x+Math.sin(heading)*speed*step,z=a.z-Math.cos(heading)*speed*step;
   const clearTraffic=this.agents.every(b=>b===a||Math.hypot(b.x-x,b.z-z)>(a.route.length+b.route.length)/2||!vesselOverlap({x,z,heading,length:a.route.length,beam:a.route.beam},{...b,length:b.route.length,beam:b.route.beam}));
   if(clearTraffic&&trafficHullClear(x,z,heading,a.route.length,a.route.beam)){a.x=x;a.z=z;a.heading=heading;a.speed=speed;a.phase='sailing';}
   else{a.speed=Math.max(0,a.speed-profile.accel*step);a.yawRate=0;a.phase='blocked';a.decision=0;}
   a.vx=Math.sin(a.heading)*a.speed;a.vz=-Math.cos(a.heading)*a.speed;
  }
  for(const [i,b] of CHANNEL_BERTHS.entries()){
   const port=i===0?'malo':'dinard',record=this.berths.ports[port],near=Math.hypot(player.x-b.point[0],player.z-b.point[1])<220;
   record.playerPresent=near;if(near){if(!record.owner&&!record.reserved){record.owner='player';record.queue=record.queue.filter(id=>id!=='player');}this.berths.request(port,'player');this.berths.occupy(port,'player');}else this.berths.release(port,'player');
  }
 }
 contact(s:VesselState):string|undefined{
  const player={...s,length:194.7,beam:27.8};return this.agents.find(a=>vesselOverlap(player,{...a,length:a.route.length,beam:a.route.beam}))?.route.name;
 }
}
