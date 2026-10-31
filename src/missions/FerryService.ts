import type { BoatParameters } from '../ships/parameters.ts';
import { vesselMission } from './vesselMission.ts';
import { BOAT, clamp, KNOT } from '../ships/parameters.ts';
import { Mission, dockingStatus } from './Mission.ts';
import type { MissionResult, MissionSnapshot, Telemetry } from './Mission.ts';
import { MALO_DINARD } from './definitions.ts';
import type { MissionDefinition } from './definitions.ts';
import { dockingRules } from './docking.ts';

export const CROSSING_SECONDS=360;
export const STOPOVER_SECONDS=120;
const EPSILON=1e-6;
export interface ServiceTiming {
  scheduledDeparture:number; arrivalDue:number; arrivedAt:number|null; nextDeparture:number|null;
  navigationSeconds:number; stopoverSeconds:number; cumulativeDelay:number; skippedSeconds:number;
  arrivalSatisfaction?:number|null;
}
export interface ServiceSnapshot {
  crossingSeconds?:number;
  runId:string; completed:number; transported:number; elapsed:number; accountedSeconds:number;
  satisfactionTotal:number; dockingTotal:number; approachContacts:number; currentDockQuality:number|null;
  timing?:ServiceTiming;
}
export interface ServiceResult {
  runId:string; completed:number; transported:number; elapsed:number; playedSeconds:number;
  satisfaction:number|null; dockingQuality:number|null; finishedAt:string;
}

/** Stable loads across save/reload, varied without an unbounded manifest or random state. */
export function servicePassengers(leg:number,capacity:number=BOAT.passengers):number {return Math.min(capacity,140+(leg*47+40)%121);}
export function serviceDefinition(leg:number,boat:BoatParameters=BOAT):MissionDefinition {
  const outbound=leg%2===0,base=vesselMission(MALO_DINARD,boat);
  const origin=outbound?base.origin:{name:base.destination.name,berth:{...base.destination.berth},exitDistance:80};
  const destination=outbound?base.destination:{name:base.origin.name,berth:{...base.origin.berth},headings:[Math.PI/2,-Math.PI/2],approach:{x:780,z:370,heading:-Math.PI/2},approachRadius:220,dockingRadius:95};
  return {...base,origin,destination,passengers:servicePassengers(leg,boat.passengers),
    title:outbound?'Saint-Malo → Dinard':'Dinard → Saint-Malo',
    route:outbound?base.route:base.route.slice(0,-1).reverse().map((p,i)=>({...p,label:['Sortie de Dinard','Milieu de baie','Approche de Saint-Malo','Cale de Dinan'][i]??'Saint-Malo'})),
    comments:{...base.comments,
      preparation:'Service Saint-Malo ↔ Dinard en continu. Chaque escale prépare automatiquement la traversée suivante.',
      boarding:`Embarquement pour ${outbound?'Dinard':'Saint-Malo'}. Les amarres restent en place.`,
      departure:'Embarquement terminé. Attendez l’autorisation de départ, puis larguez les amarres à votre convenance.',
      crossing:`Cap sur ${outbound?'Dinard':'Saint-Malo'}. Croisière conseillée : ${base.cruiseKnots} nd. Votre trajectoire reste libre.`,
      approach:`Approche de ${destination.name}. Réduisez la vitesse et rejoignez le repère ocre.`,
      unloading:`Accostage réussi à ${outbound?'Dinard':'Saint-Malo'}. Débarquement, puis embarquement du retour.`,
    }};
}

/** Owns rotations and accounting only. It never owns or changes the vessel's position. */
export class FerryService {
  readonly boat:BoatParameters;
  mission:Mission;
  readonly state:ServiceSnapshot;
  result:ServiceResult|undefined;
  constructor(snapshot?:ServiceSnapshot,leg?:MissionSnapshot,boat:BoatParameters=BOAT){
    this.boat=boat;
    this.state=snapshot?structuredClone(snapshot):{
      runId:leg?`service-${leg.runId}`:globalThis.crypto?.randomUUID?.()??`service-${Date.now()}-${Math.random()}`,completed:0,transported:0,
      elapsed:leg?.elapsed??0,accountedSeconds:leg?.accountedSeconds??0,satisfactionTotal:0,dockingTotal:0,approachContacts:0,currentDockQuality:null,
    };
    if(!snapshot&&boat.catamaran)this.state.crossingSeconds=vesselMission(MALO_DINARD,boat).targetSeconds;
    this.mission=new Mission(serviceDefinition(this.state.completed,this.boat),leg,true);
    // Legacy saves retain their voyage and clock. New timing data is bounded per service.
    if(!this.state.timing){
      const departure=Math.max(0,this.state.elapsed-this.mission.state.elapsed)+this.mission.definition.boardingSeconds;
      const arrived=this.mission.phase==='unloading'?this.state.elapsed-this.mission.state.phaseTime:null;
      this.state.timing={scheduledDeparture:departure,arrivalDue:departure+this.crossingSeconds,arrivedAt:arrived,
        nextDeparture:arrived===null?null:Math.max(departure+this.crossingSeconds,arrived)+STOPOVER_SECONDS,
        navigationSeconds:this.mission.moored?0:this.state.elapsed,stopoverSeconds:this.mission.moored?this.state.elapsed:0,
        cumulativeDelay:arrived===null?0:Math.max(0,arrived-departure-this.crossingSeconds),skippedSeconds:0};
    }
    this.syncDeparture();
  }
  get timing():ServiceTiming {return this.state.timing!;}
  get crossingSeconds():number {return this.state.crossingSeconds??CROSSING_SECONDS;}
  get hour():number {return (MALO_DINARD.departureHour+this.state.elapsed/3600)%24;}
  /** The slot rolls over independently of arrival, unloading and the active route. */
  get slotRemaining():number {
    const elapsed=Math.max(0,this.state.elapsed-this.timing.scheduledDeparture);
    const offset=elapsed%this.crossingSeconds;
    return offset<EPSILON||this.crossingSeconds-offset<EPSILON?this.crossingSeconds:this.crossingSeconds-offset;
  }
  get departureAt():number {return this.timing.nextDeparture??this.timing.scheduledDeparture;}
  get waitRemaining():number {return Math.max(0,this.departureAt-this.state.elapsed);}
  get delay():number {
    const s=this.timing;
    if(s.arrivedAt!==null)return Math.max(0,s.arrivedAt-s.arrivalDue);
    return Math.max(0,this.state.elapsed-(this.mission.moored?s.scheduledDeparture:s.arrivalDue));
  }
  get cumulativeDelay():number {return this.timing.cumulativeDelay+(this.timing.arrivedAt===null&&!this.mission.moored?this.delay:0);}
  get status():'En avance'|'À l’heure'|'En retard'|'En escale' {
    if(this.mission.moored){
      if(this.timing.arrivedAt!==null&&this.state.elapsed<this.timing.arrivalDue-EPSILON)return 'En avance';
      return 'En escale';
    }
    return this.delay>EPSILON?'En retard':'À l’heure';
  }
  get canSkipWait():boolean {
    return !this.result&&this.mission.phase==='unloading'&&this.mission.state.phaseTime>=this.transferSeconds-EPSILON&&this.waitRemaining>EPSILON;
  }
  private get transferSeconds():number {return this.mission.definition.unloadingSeconds+MALO_DINARD.boardingSeconds;}
  /** Transfers run at the actual arrival port, before activating the reverse mission. */
  get transfer():{phase:'unloading'|'boarding'|'departure';phaseTime:number;total:number}|undefined {
    if(this.mission.phase!=='unloading')return;
    const elapsed=this.mission.state.phaseTime-this.mission.definition.unloadingSeconds;
    if(elapsed<0)return {phase:'unloading',phaseTime:this.mission.state.phaseTime,total:this.mission.definition.passengers};
    const boarding=MALO_DINARD.boardingSeconds;
    return {phase:elapsed<boarding?'boarding':'departure',phaseTime:elapsed,total:servicePassengers(this.state.completed+1,this.boat.passengers)};
  }
  private syncDeparture():void {
    this.mission.departureAllowed=this.waitRemaining<=EPSILON;
    this.mission.unloadingAllowed=this.waitRemaining<=EPSILON;
  }
  release():boolean {
    this.syncDeparture();
    if(this.result||this.mission.phase!=='departure'||this.mission.state.released||!this.mission.departureAllowed)return false;
    this.mission.release();return this.mission.state.released;
  }
  skipWait(t:Telemetry,satisfaction:number):{seconds:number;arrival:MissionResult|undefined}|undefined {
    // Check the berth again, including on restored saves. Never advance navigation.
    if(!this.canSkipWait||!dockingStatus(this.mission.definition,t).valid)return;
    const skipped=this.waitRemaining;
    const arrival=this.update(skipped,t,satisfaction);this.timing.skippedSeconds+=skipped;
    return {seconds:skipped,arrival};
  }
  recover():boolean {
    if(this.mission.moored)return false;
    this.mission.recover();this.syncDeparture();
    return true;
  }
  get originPort():'malo'|'dinard' {return this.state.completed%2===0?'malo':'dinard';}
  get destinationPort():'malo'|'dinard' {return this.originPort==='malo'?'dinard':'malo';}
  get destinationName():string {return this.destinationPort==='malo'?'Saint-Malo':'Dinard';}
  dock(t:Telemetry,satisfaction?:number):boolean {
    if(!this.mission.dock(t))return false;
    this.timing.arrivedAt=this.state.elapsed;
    this.timing.arrivalSatisfaction=satisfaction===undefined?null:clamp(satisfaction,0,100);
    this.timing.nextDeparture=Math.max(this.timing.arrivalDue,this.state.elapsed)+STOPOVER_SECONDS;
    this.timing.cumulativeDelay+=Math.max(0,this.state.elapsed-this.timing.arrivalDue);
    this.syncDeparture();
    const incidents=Math.max(0,this.mission.state.metrics.contacts-this.state.approachContacts);
    this.state.currentDockQuality=clamp(100-20*t.speed/KNOT/dockingRules(this.mission.definition).speedKnots-incidents*20,0,100);
    return true;
  }
  update(dt:number,t:Telemetry,satisfaction:number):MissionResult|undefined {
    if(this.result||this.mission.phase==='preparation'||!Number.isFinite(dt)||dt<=0)return;
    // Split timed operations so a long step and many small steps have the same outcome.
    let remaining=dt,result:MissionResult|undefined;
    while(remaining>0){
      const m=this.mission;
      const boundary=m.phase==='boarding'?m.definition.boardingSeconds-m.state.phaseTime:
        m.phase==='unloading'?this.waitRemaining:remaining;
      const step=Math.min(remaining,Math.max(EPSILON,boundary));
      const moored=m.moored;
      this.state.elapsed+=step;
      if(moored)this.timing.stopoverSeconds+=step;else this.timing.navigationSeconds+=step;
      this.syncDeparture();
      result=this.updateMission(step,t,satisfaction)??result;
      remaining=Math.max(0,remaining-step);
      this.syncDeparture();
    }
    return result;
  }
  private updateMission(dt:number,t:Telemetry,satisfaction:number):MissionResult|undefined {
    const previous=this.mission.phase,contacts=this.mission.state.metrics.contacts;
    if(previous==='unloading'&&this.timing.arrivalSatisfaction==null)this.timing.arrivalSatisfaction=clamp(satisfaction,0,100);
    this.mission.update(dt,t);
    if(previous==='crossing'&&this.mission.phase==='approach')this.state.approachContacts=contacts;
    if(this.mission.phase!=='complete'||!this.mission.result)return;
    const result=this.mission.result;
    this.accountArrival(result,satisfaction);
    this.timing.scheduledDeparture=this.timing.nextDeparture??this.state.elapsed;
    this.timing.arrivalDue=this.timing.scheduledDeparture+this.crossingSeconds;
    this.timing.arrivedAt=null;this.timing.nextDeparture=null;
    this.timing.arrivalSatisfaction=null;
    this.mission=new Mission(serviceDefinition(this.state.completed,this.boat),undefined,true);
    // The return passengers already boarded during the stopover. Departure stays manual.
    this.mission.state.phase='departure';
    return result;
  }
  private accountArrival(result:MissionResult,satisfaction:number):void {
    this.state.completed++;this.state.transported+=result.passengers;
    this.state.satisfactionTotal+=(this.timing.arrivalSatisfaction??clamp(satisfaction,0,100))*result.passengers;
    this.state.dockingTotal+=this.state.currentDockQuality??clamp(100-result.metrics.contacts*20,0,100);
    this.state.accountedSeconds+=result.playedSeconds;
    this.state.approachContacts=0;this.state.currentDockQuality=null;
  }
  finish(satisfaction=100):ServiceResult {
    if(this.result)return this.result;
    // Stopping in an unfinished layover must still credit passengers already unloaded.
    if(this.mission.phase==='unloading'&&this.mission.state.phaseTime>=this.mission.definition.unloadingSeconds){
      this.mission.result=this.mission.makeResult(true,`Arrivée validée à ${this.mission.definition.destination.name}.`);
      this.accountArrival(this.mission.result,satisfaction);
    }
    const s=this.state;
    this.result={runId:s.runId,completed:s.completed,transported:s.transported,elapsed:s.elapsed,
      playedSeconds:Math.max(0,s.elapsed-s.accountedSeconds),satisfaction:s.transported?s.satisfactionTotal/s.transported:null,
      dockingQuality:s.completed?s.dockingTotal/s.completed:null,finishedAt:new Date().toISOString()};
    this.mission.state.phase='complete';
    return this.result;
  }
}

export function validService(value:unknown):value is ServiceSnapshot {
  if(!value||typeof value!=='object')return false;
  const s=value as ServiceSnapshot;
  const finite=(n:unknown,max=1e12):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
  if(s.crossingSeconds!==undefined&&(!finite(s.crossingSeconds,3600)||s.crossingSeconds<60))return false;
  if(s.timing!==undefined){
    const t=s.timing;
    if(!t||typeof t!=='object'||![t.scheduledDeparture,t.arrivalDue,t.navigationSeconds,t.stopoverSeconds,t.cumulativeDelay,t.skippedSeconds].every(n=>finite(n)))return false;
    if(t.arrivalSatisfaction!=null&&!finite(t.arrivalSatisfaction,100))return false;
    if(Math.abs(t.arrivalDue-t.scheduledDeparture-(s.crossingSeconds??CROSSING_SECONDS))>EPSILON
      ||Math.abs(t.navigationSeconds+t.stopoverSeconds-s.elapsed)>Math.max(EPSILON,s.elapsed*1e-10)||t.skippedSeconds>t.stopoverSeconds+EPSILON)return false;
    if(t.arrivedAt===null){if(t.nextDeparture!==null)return false;}
    else if(!finite(t.arrivedAt,s.elapsed)||!finite(t.nextDeparture)
      ||Math.abs(t.nextDeparture-Math.max(t.arrivalDue,t.arrivedAt)-STOPOVER_SECONDS)>EPSILON)return false;
  }
  return typeof s.runId==='string'&&s.runId.length>0&&s.runId.length<200&&finite(s.completed,1e9)&&Number.isInteger(s.completed)
    &&finite(s.transported,s.completed*BOAT.passengers)&&Number.isInteger(s.transported)&&s.transported>=s.completed*140
    &&finite(s.elapsed)&&finite(s.accountedSeconds,s.elapsed+1e-6)&&finite(s.satisfactionTotal,s.transported*100)
    &&finite(s.dockingTotal,s.completed*100)&&finite(s.approachContacts)&&Number.isInteger(s.approachContacts)
    &&(s.currentDockQuality===null||finite(s.currentDockQuality,100));
}
