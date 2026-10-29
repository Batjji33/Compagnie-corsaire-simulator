import { clamp, KNOT } from '../ships/parameters.ts';
import type { MissionDefinition, MissionPhase } from './definitions.ts';

export interface Telemetry {
  x:number;z:number;heading:number;speed:number;yawRate:number;port:number;starboard:number;
  commandPort:number;commandStarboard:number;contact:string;damage:number;clearance:number;
}
export interface MissionMetrics { contacts:number; impactDamage:number; unsafeSeconds:number; discomfort:number; recoveries:number; distance:number }
export interface MissionResult {
  runId:string;missionId:string;completed:boolean;elapsed:number;passengers:number;
  punctuality:number;safety:number;comfort:number;manoeuvres:number;score:number;
  grade:string;reason:string;metrics:MissionMetrics;finishedAt:string;
  playedSeconds:number;
}
export interface MissionSnapshot {
  runId:string;phase:MissionPhase;elapsed:number;phaseTime:number;released:boolean;hold:number;
  checkpoint:'departure'|'approach';metrics:MissionMetrics;groundedSeconds:number;visited:number[];
  accountedSeconds:number;
}
export interface DockingStatus {distance:number;angle:number;speedKnots:number;neutral:boolean;valid:boolean}
export function dockingStatus(def:MissionDefinition,t:Telemetry):DockingStatus {
  const distance=Math.hypot(t.x-def.destination.berth.x,t.z-def.destination.berth.z);
  const angle=Math.min(...def.destination.headings.map(h=>Math.abs(Math.atan2(Math.sin(t.heading-h),Math.cos(t.heading-h)))*180/Math.PI));
  const neutral=Math.max(Math.abs(t.port),Math.abs(t.starboard))<.08&&Math.max(Math.abs(t.commandPort),Math.abs(t.commandStarboard))<.03;
  return {distance,angle,speedKnots:t.speed/KNOT,neutral,valid:distance<=def.docking.distance&&angle<=def.docking.angleDegrees&&t.speed/KNOT<=def.docking.speedKnots&&neutral&&Math.abs(t.yawRate)<.015&&!t.contact&&t.clearance>.3};
}
export class Mission {
  readonly definition:MissionDefinition;
  state:MissionSnapshot;
  result:MissionResult|undefined;
  failure='';
  private lastContact=false;
  private previousSpeed:number|undefined;
  private previousPosition:{x:number;z:number}|undefined;
  private previousDamage:number|undefined;
  constructor(definition:MissionDefinition,snapshot?:MissionSnapshot){
    this.definition=definition;
    this.state=snapshot?structuredClone(snapshot):{
      runId:globalThis.crypto?.randomUUID?.()??`run-${Date.now()}-${Math.random()}`,phase:'preparation',elapsed:0,phaseTime:0,released:false,hold:0,
      checkpoint:'departure',metrics:{contacts:0,impactDamage:0,unsafeSeconds:0,discomfort:0,recoveries:0,distance:0},groundedSeconds:0,visited:[],accountedSeconds:0,
    };
  }
  get phase():MissionPhase{return this.state.phase;}
  get finished():boolean{return this.phase==='complete'||this.phase==='failed';}
  get moored():boolean{return this.phase==='preparation'||this.phase==='boarding'||(this.phase==='departure'&&!this.state.released)||this.phase==='unloading'||this.finished;}
  private enter(phase:MissionPhase):void {this.state.phase=phase;this.state.phaseTime=0;this.state.hold=0;}
  board():void {if(this.phase==='preparation')this.enter('boarding');}
  release():void {if(this.phase==='departure')this.state.released=true;}
  dock(t:Telemetry):boolean {
    if(this.phase!=='docking'||this.state.hold<this.definition.docking.holdSeconds||!dockingStatus(this.definition,t).valid)return false;
    this.enter('unloading');return true;
  }
  update(dt:number,t:Telemetry):void {
    if(this.phase==='preparation'||this.finished)return;
    const s=this.state,d=this.definition;
    s.elapsed+=dt;s.phaseTime+=dt;
    if(!this.moored){
      if(this.previousPosition)s.metrics.distance+=Math.hypot(t.x-this.previousPosition.x,t.z-this.previousPosition.z);
      const contact=!!t.contact;
      if(contact&&!this.lastContact)s.metrics.contacts++;
      s.metrics.impactDamage+=Math.max(0,t.damage-(this.previousDamage??t.damage));
      if(t.clearance<=0)s.groundedSeconds+=dt;
      const nearOrigin=Math.hypot(t.x-d.origin.berth.x,t.z-d.origin.berth.z)<d.origin.exitDistance;
      const limit=nearOrigin?d.rules.departureKnots:this.phase==='approach'||this.phase==='docking'?d.rules.approachKnots:21;
      if(t.speed/KNOT>limit)s.metrics.unsafeSeconds+=dt;
      const acceleration=this.previousSpeed===undefined?0:Math.abs(t.speed-this.previousSpeed)/dt;
      s.metrics.discomfort+=Math.max(0,acceleration-.35)*dt+Math.max(0,Math.abs(t.yawRate)*t.speed-.35)*dt;
      this.lastContact=contact;
    }
    this.previousPosition={x:t.x,z:t.z};this.previousSpeed=t.speed;this.previousDamage=t.damage;
    if(t.damage>=d.rules.maxDamage){this.fail('Coque trop endommagée pour transporter les passagers.');return;}
    if(s.groundedSeconds>d.rules.maxGroundedSeconds){this.fail('Échouement prolongé : assistance nécessaire.');return;}
    if(s.elapsed>d.maxSeconds+s.metrics.recoveries*300){this.fail('Temps maximal de mission dépassé. Reprenez au point sûr pour disposer de 5 minutes supplémentaires.');return;}
    if(Math.abs(t.x)>5200||Math.abs(t.z)>5200){this.fail('Le navire a quitté la zone de jeu.');return;}
    switch(this.phase){
      case 'boarding':if(s.phaseTime>=d.boardingSeconds)this.enter('departure');break;
      case 'departure':if(s.released&&Math.hypot(t.x-d.origin.berth.x,t.z-d.origin.berth.z)>=d.origin.exitDistance)this.enter('crossing');break;
      case 'crossing':
        d.route.forEach((p,i)=>{if(!s.visited.includes(i)&&Math.hypot(t.x-p.x,t.z-p.z)<100)s.visited.push(i);});
        if(Math.hypot(t.x-d.destination.berth.x,t.z-d.destination.berth.z)<d.destination.approachRadius){s.checkpoint='approach';this.enter('approach');}
        break;
      case 'approach':if(Math.hypot(t.x-d.destination.berth.x,t.z-d.destination.berth.z)<d.destination.dockingRadius)this.enter('docking');break;
      case 'docking':s.hold=dockingStatus(d,t).valid?s.hold+dt:0;break;
      case 'unloading':if(s.phaseTime>=d.unloadingSeconds){this.enter('complete');this.result=this.makeResult(true,`Arrivée validée à ${d.destination.name}.`);}break;
    }
  }
  fail(reason:string):void {if(this.finished)return;this.failure=reason;this.enter('failed');this.result=this.makeResult(false,reason);}
  recover():void {
    if(this.result)this.state.accountedSeconds=this.state.elapsed;
    this.state.metrics.recoveries++;this.state.groundedSeconds=0;this.state.released=true;
    this.result=undefined;this.failure='';
    // A recovery is a new attempt so a previously saved failure cannot overwrite its result.
    this.state.runId=globalThis.crypto?.randomUUID?.()??`recovery-${Date.now()}-${Math.random()}`;
    this.enter(this.state.checkpoint);this.previousPosition=undefined;this.previousSpeed=undefined;this.previousDamage=undefined;this.lastContact=false;
  }
  makeResult(completed:boolean,reason:string):MissionResult {
    const s=this.state,m=s.metrics;
    const punctuality=Math.round(clamp(100-Math.max(0,s.elapsed-this.definition.targetSeconds)/3,0,100));
    const safety=Math.round(clamp(100-m.contacts*12-m.impactDamage*80-m.unsafeSeconds*.5-s.groundedSeconds*2,0,100));
    const comfort=Math.round(clamp(100-m.discomfort*2,0,100));
    const manoeuvres=Math.round(clamp(100-m.contacts*8-m.recoveries*15,0,100));
    const score=completed?Math.round(punctuality*.2+safety*.35+comfort*.2+manoeuvres*.25):0;
    return {runId:s.runId,missionId:this.definition.id,completed,elapsed:s.elapsed,passengers:completed?this.definition.passengers:0,
      punctuality,safety,comfort,manoeuvres,score,grade:!completed?'Interrompue':score>=90?'Excellent':score>=75?'Très bien':score>=55?'Validée':'À améliorer',reason,metrics:structuredClone(m),finishedAt:new Date().toISOString(),playedSeconds:Math.max(0,s.elapsed-(s.accountedSeconds??0))};
  }
}
