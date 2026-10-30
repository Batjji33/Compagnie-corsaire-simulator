import { BOAT, KNOT, clamp } from '../ships/parameters.ts';
import { LANDS, ROCKS, DOCKS, inside } from '../world/geography.ts';
import type { VesselState } from '../physics/VesselDynamics.ts';

export type TrafficKind='sail'|'pleasure'|'ferry'|'launch';
export interface TrafficRoute {id:string;name:string;kind:TrafficKind;knots:number;length:number;beam:number;points:readonly (readonly [number,number])[]}
export const TRAFFIC_ROUTES:TrafficRoute[]=[
  {id:'ferry-1',name:'Navette de la baie',kind:'ferry',knots:12,length:29,beam:8,points:[[-850,1230],[-470,1000],[0,780],[480,540],[800,360]]},
  {id:'sail-1',name:'Voilier Avel',kind:'sail',knots:4.5,length:10,beam:3,points:[[-580,580],[-180,500],[300,900],[-420,1000]]},
  {id:'pleasure-1',name:'Plaisance Écume',kind:'pleasure',knots:7,length:8,beam:3,points:[[-750,1350],[-400,1700],[100,1450],[-100,1150]]},
  {id:'launch-1',name:'Vedette Armor',kind:'launch',knots:14,length:14,beam:4,points:[[800,600],[450,950],[-300,1150],[-600,900],[0,680]]},
  {id:'sail-2',name:'Voilier Noroît',kind:'sail',knots:5.5,length:12,beam:3.6,points:[[-1000,-1600],[-500,-2100],[700,-1800],[500,-1400]]},
  {id:'ferry-2',name:'Ferry du large',kind:'ferry',knots:10,length:34,beam:9,points:[[-2200,-2200],[-1200,-2600],[0,-2600],[1600,-2300]]},
  {id:'pleasure-2',name:'Plaisance Alizé',kind:'pleasure',knots:6,length:9,beam:3,points:[[0,300],[450,350],[600,750],[0,1000]]},
  {id:'launch-2',name:'Vedette du Sillon',kind:'launch',knots:11,length:13,beam:4,points:[[400,-1500],[800,-1700],[1400,-1600],[1100,-1500]]},
];
export interface MovingPoint {x:number;z:number;vx:number;vz:number}
export function closestApproach(a:MovingPoint,b:MovingPoint,horizon=35):{distance:number;seconds:number;closing:boolean} {
  const x=b.x-a.x,z=b.z-a.z,vx=b.vx-a.vx,vz=b.vz-a.vz,v2=vx*vx+vz*vz;
  const raw=v2>1e-8?-(x*vx+z*vz)/v2:0,seconds=clamp(raw,0,horizon);
  return {distance:Math.hypot(x+vx*seconds,z+vz*seconds),seconds,closing:raw>0};
}
export function navigable(x:number,z:number,margin=12):boolean {
  for(const [dx,dz] of [[0,0],[-margin,0],[margin,0],[0,-margin],[0,margin]])for(const land of LANDS)if(inside(x+dx,z+dz,land.outline))return false;
  return ROCKS.every(r=>Math.hypot(x-r.x,z-r.z)>r.radius+margin)&&DOCKS.every(d=>Math.hypot(x-d.point[0],z-d.point[1])>60+margin);
}
export interface TrafficAgent extends MovingPoint {route:TrafficRoute;active:boolean;heading:number;speed:number;target:number;direction:number;aiTime:number;desiredHeading:number;desiredSpeed:number;avoiding:boolean}
export interface TrafficRisk {id:string;name:string;distance:number;cpa:number;seconds:number}
export interface TrafficContact {x:number;z:number;yaw:number;label:string;impact:number}
export function trafficDensity(hour:number,waves:number,visibility:number):number {
  const daytime=hour>=8&&hour<20;return visibility<1800?3:waves>1.5?4:daytime?8:3;
}
export class Traffic {
  enabled=true;limit=8;targetCount=8;risk:TrafficRisk|undefined;elapsed=0;
  readonly agents:TrafficAgent[]=TRAFFIC_ROUTES.map((route,i)=>{
    const index=i===3?0:i%route.points.length,p=route.points[index],next=(index+1)%route.points.length,q=route.points[next];
    const heading=Math.atan2(q[0]-p[0],-(q[1]-p[1]));
    return {route,active:false,x:p[0],z:p[1],vx:0,vz:0,heading,speed:0,target:next,direction:1,aiTime:0,desiredHeading:heading,desiredSpeed:0,avoiding:false};
  });
  private riskTimer=0;
  private contact:TrafficContact={x:0,z:0,yaw:0,label:'',impact:0};
  update(dt:number,player:VesselState,hour:number,waves:number,visibility:number):void {
    this.elapsed+=dt;this.targetCount=this.enabled?Math.min(this.limit,trafficDensity(hour,waves,visibility)):0;
    let count=this.agents.filter(a=>a.active).length;
    for(const a of this.agents){
      const distance=Math.hypot(a.x-player.x,a.z-player.z);
      if(!this.enabled||(count>this.targetCount&&distance>650)){if(a.active)count--;a.active=false;}
      else if(!a.active&&count<this.targetCount&&distance>180){a.active=true;count++;}
      if(!a.active)continue;
      a.aiTime-=dt;
      if(a.aiTime<=0){this.steer(a,player,waves,visibility);a.aiTime=distance>1200?.5:.1;}
      const turn={sail:.12,pleasure:.22,ferry:.1,launch:.24}[a.route.kind];
      const delta=Math.atan2(Math.sin(a.desiredHeading-a.heading),Math.cos(a.desiredHeading-a.heading));
      a.heading+=clamp(delta,-turn*dt,turn*dt);a.speed+=(a.desiredSpeed-a.speed)*(1-Math.exp(-dt/3));
      const vx=Math.sin(a.heading)*a.speed,vz=-Math.cos(a.heading)*a.speed;
      const x=a.x+vx*dt,z=a.z+vz*dt;
      if(navigable(x,z,a.route.length*.45)){a.x=x;a.z=z;a.vx=vx;a.vz=vz;}
      else {a.speed=0;a.vx=a.vz=0;a.desiredHeading=a.heading+.7;a.aiTime=.5;}
    }
    this.riskTimer-=dt;if(this.riskTimer<=0){this.detectRisk(player);this.riskTimer=.1;}
  }
  private steer(a:TrafficAgent,player:VesselState,waves:number,visibility:number):void {
    const route=a.route,p=route.points[a.target];
    if(Math.hypot(a.x-p[0],a.z-p[1])<45){
      if(a.target===route.points.length-1)a.direction=-1;else if(a.target===0)a.direction=1;
      a.target+=a.direction;
    }
    const target=route.points[a.target];a.desiredHeading=Math.atan2(target[0]-a.x,-(target[1]-a.z));
    const weather=Math.max(.4,1-waves*.13)*(visibility<3000?.65:1);
    a.desiredSpeed=route.knots*KNOT*weather;a.avoiding=false;
    const pv=this.playerVelocity(player);
    const others:MovingPoint[]=[pv,...this.agents.filter(b=>b!==a&&b.active)];
    for(const b of others){
      if(Math.hypot(a.x-b.x,a.z-b.z)>300)continue;
      const cpa=closestApproach(a,b,28),near=Math.hypot(a.x-b.x,a.z-b.z)<55;
      if((cpa.closing&&cpa.distance<55)||near){a.desiredHeading+=.65;a.desiredSpeed*=.35;a.avoiding=true;break;}
    }
    const look=Math.max(35,a.speed*8),x=a.x+Math.sin(a.desiredHeading)*look,z=a.z-Math.cos(a.desiredHeading)*look;
    if(!navigable(x,z,route.length*.45)){
      a.avoiding=true;a.desiredSpeed*=.35;
      for(const offset of [.7,-.7,1.4,-1.4,Math.PI]){
        const heading=a.desiredHeading+offset;
        if(navigable(a.x+Math.sin(heading)*look,a.z-Math.cos(heading)*look,route.length*.45)){a.desiredHeading=heading;break;}
      }
    }
  }
  private playerVelocity(s:VesselState):MovingPoint {return {x:s.x,z:s.z,vx:Math.sin(s.heading)*s.surge+Math.cos(s.heading)*s.sway,vz:-Math.cos(s.heading)*s.surge+Math.sin(s.heading)*s.sway};}
  detectRisk(player:VesselState):void {
    this.risk=undefined;const p=this.playerVelocity(player);
    for(const a of this.agents){if(!a.active)continue;
      const distance=Math.hypot(a.x-p.x,a.z-p.z),cpa=closestApproach(p,a);
      if(distance<450&&((cpa.closing&&cpa.distance<45+a.route.length/2)||distance<35)){
        if(!this.risk||cpa.seconds<this.risk.seconds)this.risk={id:a.route.id,name:a.route.name,distance,cpa:cpa.distance,seconds:cpa.seconds};
      }
    }
  }
  contacts(s:VesselState):TrafficContact {
    const r=this.contact;r.x=r.z=r.yaw=r.impact=0;r.label='';const pv=this.playerVelocity(s);
    for(const a of this.agents){if(!a.active||Math.hypot(a.x-s.x,a.z-s.z)>BOAT.length+a.route.length)continue;
      const sin=Math.sin(a.heading),cos=Math.cos(a.heading),half=a.route.length*.35;
      for(const forward of [-9,0,9]){
        const x=s.x+Math.sin(s.heading)*forward,z=s.z-Math.cos(s.heading)*forward;
        const along=clamp((x-a.x)*sin-(z-a.z)*cos,-half,half),qx=a.x+sin*along,qz=a.z-cos*along;
        const dx=x-qx,dz=z-qz,distance=Math.hypot(dx,dz),penetration=(BOAT.beam+a.route.beam)/2-distance;
        if(penetration<=0)continue;
        const rvx=pv.vx-a.vx,rvz=pv.vz-a.vz,relativeSpeed=Math.hypot(rvx,rvz);
        const nx=distance>1e-6?dx/distance:relativeSpeed>1e-6?-rvx/relativeSpeed:Math.cos(s.heading),nz=distance>1e-6?dz/distance:relativeSpeed>1e-6?-rvz/relativeSpeed:Math.sin(s.heading);
        const approach=(pv.vx-a.vx)*nx+(pv.vz-a.vz)*nz;
        const force=Math.min(200000,Math.max(0,65000*penetration-38000*approach));
        r.x+=nx*force;r.z+=nz*force;r.yaw+=forward*(Math.cos(s.heading)*nx+Math.sin(s.heading)*nz)*force;
        r.impact=Math.max(r.impact,-approach);r.label=a.route.name;a.desiredSpeed=0;a.avoiding=true;
      }
    }
    return r;
  }
}
