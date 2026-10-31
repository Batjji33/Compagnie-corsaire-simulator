import type { BoatParameters } from '../ships/parameters.ts';
import { BOAT, KNOT, clamp } from '../ships/parameters.ts';
import type { VesselState } from '../physics/VesselDynamics.ts';
import { Berths, TAXI_PORTS } from './Berths.ts';
import type { PortId } from './Berths.ts';
import { closestApproach, navigable } from './Traffic.ts';
import type { TrafficAgent, TrafficRoute } from './Traffic.ts';

export type TaxiPhase='crossing'|'approach'|'waiting'|'docking'|'stopover'|'departure';
export interface TaxiState {phase:TaxiPhase;destination:PortId;point:number;elapsed:number;rotations:number;waitingForPlayer:number;nextHorn:number;passengers:number;transported:number;astern:boolean}
export interface TaxiHorn {id:string;name:string;x:number;z:number}
export const TAXI_LIVERIES=[
  {name:'Étoile de la Rance',hull:0x346f85,cabin:0xf1eee4,accent:0xd7ab50},
  {name:'Belle du Moulinet',hull:0x8b4645,cabin:0xe9e3d8,accent:0x426e67},
  {name:'Alizé de Cézembre',hull:0x376b59,cabin:0xf4f1e8,accent:0xc58c47},
] as const;
// Opposite sailing lanes have 90 m separation; the final manoeuvre is reserved separately.
const OUTBOUND=[[720,485],[300,695],[-200,895],[-650,1075],[-820,1300]];
const INBOUND=[[-650,985],[-200,805],[300,605],[650,430],[780,370]];
export const TAXI_CRUISE_KNOTS=20;
export const TAXI_STOPOVER_SECONDS=90;
export const TAXI_UNLOADING_SECONDS=12;
export const TAXI_BOARDING_SECONDS=18;
export const TAXI_ROUTES:TrafficRoute[]=TAXI_LIVERIES.map((v,i)=>({id:`taxi-${i+1}`,name:v.name,kind:'ferry',taxi:true,knots:TAXI_CRUISE_KNOTS,length:BOAT.length,beam:BOAT.beam,points:(i===1?INBOUND:OUTBOUND) as [number,number][]}));
const taxiLoad=(index:number,rotations:number)=>140+(index*41+rotations*29)%121;
export function taxiState(index:number):TaxiState {return {phase:'crossing',destination:index===1?'malo':'dinard',point:index===0?3:index===1?1:0,elapsed:0,rotations:0,waitingForPlayer:0,nextHorn:30,passengers:taxiLoad(index,0),transported:0,astern:false};}
const angle=(r:number)=>Math.atan2(Math.sin(r),Math.cos(r));

/** Uses the existing traffic agents: no extra render loop, collision list or hidden fleet. */
export class WaterTaxis {
  playerBoat:BoatParameters=BOAT;
  readonly berths=new Berths();
  horn:TaxiHorn|undefined;
  private elapsed=0;
  private hornUntil=0;
  readonly agents:TrafficAgent[];
  constructor(agents:TrafficAgent[]){this.agents=agents;}
  reset():void {this.berths.reset();this.horn=undefined;this.elapsed=0;this.hornUntil=0;}
  update(dt:number,player:VesselState,others:TrafficAgent[],waves:number,visibility:number):void {
    this.elapsed+=dt;
    for(const [index,a] of this.agents.entries()){
      if(!a.active)continue;
      const s=a.taxi!,port=TAXI_PORTS[s.destination],id=a.route.id;
      s.elapsed+=dt;
      const route=s.destination==='dinard'?OUTBOUND:INBOUND;
      let target={x:route[Math.min(s.point,route.length-1)][0],z:route[Math.min(s.point,route.length-1)][1]},knots=TAXI_CRUISE_KNOTS,stop=false;
      if(s.phase==='crossing'){
        if(Math.hypot(a.x-target.x,a.z-target.z)<40){s.point++;if(s.point>=route.length){s.phase='approach';s.elapsed=0;}}
        if(Math.hypot(a.x-port.berth.x,a.z-port.berth.z)<(s.destination==='dinard'?250:350)){s.phase='approach';s.elapsed=0;}
      }
      if(s.phase==='approach'||s.phase==='waiting'){
        const granted=this.berths.request(s.destination,id);
        s.phase=granted?'approach':'waiting';
        if(granted){
          target=port.approach;knots=12;stop=true;
          if(Math.hypot(a.x-target.x,a.z-target.z)<4&&a.speed<.4){s.phase='docking';s.elapsed=0;s.point=s.destination==='malo'?0:1;}
        }else{
          const position=Math.max(0,this.berths.ports[s.destination].queue.indexOf(id));
          target={x:port.hold.x+index*55,z:port.hold.z+position*85};knots=3;stop=true;
        }
      }
      if(s.phase==='docking'){
        // An unexpected player intrusion revokes permission to advance, without changing position.
        if(this.berths.ports[s.destination].playerPresent){knots=0;target={x:a.x,z:a.z};stop=true;}
        else{
          target=s.destination==='malo'&&s.point===0?{x:850,z:264}:port.berth;knots=6;stop=true;
          if(Math.hypot(a.x-target.x,a.z-target.z)<1.2&&a.speed<.16){
            if(s.point===0)s.point=1;
            else if(this.berths.occupy(s.destination,id)){s.phase='stopover';s.elapsed=0;}
          }
        }
      }
      if(s.phase==='stopover'){
        knots=0;target={x:a.x,z:a.z};stop=true;
        const load=taxiLoad(index,s.rotations),unloaded=Math.floor(load*clamp(s.elapsed/TAXI_UNLOADING_SECONDS,0,1));
        s.transported+=unloaded-Math.floor(load*clamp((s.elapsed-dt)/TAXI_UNLOADING_SECONDS,0,1));
        s.passengers=s.elapsed<TAXI_UNLOADING_SECONDS?load-unloaded:Math.floor(taxiLoad(index,s.rotations+1)*clamp((s.elapsed-TAXI_UNLOADING_SECONDS)/TAXI_BOARDING_SECONDS,0,1));
        if(s.elapsed+1e-7>=TAXI_STOPOVER_SECONDS){s.phase='departure';s.elapsed=0;s.astern=true;s.point=s.destination==='malo'?0:1;}
      }
      if(s.phase==='departure'){
        const escape=s.destination==='malo'?OUTBOUND[0]:INBOUND[0];
        target=s.point===0?{x:850,z:264}:s.point===1?port.approach:{x:escape[0],z:escape[1]};knots=s.point<2?(s.destination==='malo'?8:6):12;stop=s.point<2;
        if(Math.hypot(a.x-target.x,a.z-target.z)<(stop?4:20)&&(!stop||a.speed<.35)){
          if(s.point<2){s.point++;if(s.point===2)s.astern=false;}
          else{this.berths.release(s.destination,id);s.destination=s.destination==='malo'?'dinard':'malo';s.phase='crossing';s.point=1;s.rotations++;s.astern=false;s.elapsed=0;}
        }
      }
      this.move(a,target,knots,stop,dt,player,others,waves,visibility);
      const waiting=(s.phase==='waiting'||s.phase==='approach'||s.phase==='docking')&&this.berths.ports[s.destination].playerPresent;
      s.waitingForPlayer=waiting?s.waitingForPlayer+dt:0;
      if(!waiting)s.nextHorn=30;
    }
    const eligible=(a:TrafficAgent)=>a.active&&a.taxi!.waitingForPlayer>0&&this.berths.ports[a.taxi!.destination].playerPresent;
    let calling=this.agents.find(a=>a.route.id===this.horn?.id&&eligible(a)&&this.elapsed<this.hornUntil-1e-7);
    if(!calling){
      calling=this.agents.find(a=>eligible(a)&&a.taxi!.waitingForPlayer+1e-7>=a.taxi!.nextHorn);
      if(calling){this.hornUntil=this.elapsed+5;calling.taxi!.nextHorn=calling.taxi!.waitingForPlayer+25;}
    }
    this.horn=calling?{id:calling.route.id,name:calling.route.name,x:calling.x,z:calling.z}:undefined;
  }
  private move(a:TrafficAgent,target:{x:number;z:number},knots:number,stop:boolean,dt:number,player:VesselState,others:TrafficAgent[],waves:number,visibility:number):void {
    const s=a.taxi!,distance=Math.hypot(target.x-a.x,target.z-a.z),reverse=s.astern?-1:1;
    let moveDistance=distance;
    let heading=distance>.3?Math.atan2(target.x-a.x,-(target.z-a.z))+(s.astern?Math.PI:0):a.heading;
    let speed=knots*KNOT*Math.max(.5,1-Math.max(0,waves-.6)*.1)*(visibility<1800?.6:1);
    if(stop)speed=Math.min(speed,Math.sqrt(2*.4*Math.max(0,distance-.35)));
    a.avoiding=false;
    const pv={x:player.x,z:player.z,vx:Math.sin(player.heading)*player.surge+Math.cos(player.heading)*player.sway,vz:-Math.cos(player.heading)*player.surge+Math.sin(player.heading)*player.sway};
    for(let i=-1;i<others.length;i++){
      const agent=i<0?undefined:others[i];if(agent===a||agent&&!agent.active)continue;
      const other=agent??pv;
      const length=agent?.route.length??this.playerBoat.length,clearance=(a.route.length+length)/2+14,d=Math.hypot(a.x-other.x,a.z-other.z);
      if(d>400)continue;
      const cpa=closestApproach(a,other,25);
      if(d<clearance+35||cpa.closing&&cpa.distance<clearance){
        a.avoiding=true;speed=Math.min(speed,Math.sqrt(2*.5*Math.max(0,d-clearance-8)));
        if(s.phase==='crossing'&&d>clearance+10){heading+=.35;speed*=.5;}
        // A waiting boat must yield space, rather than stop across another boat's approach.
        if((s.phase==='waiting'||s.phase==='crossing')&&d<clearance+45&&a.speed<1.6){
          heading=Math.atan2(a.x-other.x,-(a.z-other.z))+.25;
          speed=Math.min(1.3,knots*KNOT);moveDistance=Math.max(distance,50);
        }
      }
    }
    const delta=angle(heading-a.heading);a.desiredHeading=heading;a.desiredSpeed=speed;
    a.heading+=clamp(delta,-.1*dt,.1*dt);
    speed*=Math.max(0,Math.cos(delta));
    a.speed+=clamp(speed-a.speed,-.65*dt,.4*dt);
    const step=Math.min(a.speed*dt,moveDistance),vx=Math.sin(a.heading)*reverse*step/dt,vz=-Math.cos(a.heading)*reverse*step/dt;
    const x=a.x+vx*dt,z=a.z+vz*dt;
    const own=this.berths.ports[s.destination],access=own.owner===a.route.id||own.reserved===a.route.id;
    const clear=others.every(b=>b===a||!b.active||Math.hypot(x-b.x,z-b.z)>(a.route.length+b.route.length)/2+5)
      &&Math.hypot(x-player.x,z-player.z)>(a.route.length+this.playerBoat.length)/2+5;
    if(clear&&navigable(x,z,a.route.length/2,access?s.destination:undefined)){a.x=x;a.z=z;a.vx=vx;a.vz=vz;}
    else {a.speed=0;a.vx=a.vz=0;a.avoiding=true;}
  }
}
