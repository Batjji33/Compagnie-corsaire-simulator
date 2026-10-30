import { BOAT, clamp, KNOT } from '../ships/parameters.ts';
import { Mission } from './Mission.ts';
import type { MissionResult, MissionSnapshot, Telemetry } from './Mission.ts';
import { MALO_DINARD } from './definitions.ts';
import type { MissionDefinition } from './definitions.ts';
import { dockingRules } from './docking.ts';

export interface ServiceSnapshot {
  runId:string; completed:number; transported:number; elapsed:number; accountedSeconds:number;
  satisfactionTotal:number; dockingTotal:number; approachContacts:number; currentDockQuality:number|null;
}
export interface ServiceResult {
  runId:string; completed:number; transported:number; elapsed:number; playedSeconds:number;
  satisfaction:number|null; dockingQuality:number|null; finishedAt:string;
}

/** Stable loads across save/reload, varied without an unbounded manifest or random state. */
export function servicePassengers(leg:number):number {return Math.min(BOAT.passengers,140+(leg*47+40)%121);}
export function serviceDefinition(leg:number):MissionDefinition {
  const outbound=leg%2===0,base=MALO_DINARD;
  const origin=outbound?base.origin:{name:base.destination.name,berth:{...base.destination.berth},exitDistance:80};
  const destination=outbound?base.destination:{name:base.origin.name,berth:{...base.origin.berth},headings:[Math.PI/2,-Math.PI/2],approach:{x:780,z:370,heading:-Math.PI/2},approachRadius:220,dockingRadius:95};
  return {...base,origin,destination,passengers:servicePassengers(leg),
    title:outbound?'Saint-Malo → Dinard':'Dinard → Saint-Malo',
    route:outbound?base.route:base.route.slice(0,-1).reverse().map((p,i)=>({...p,label:['Sortie de Dinard','Milieu de baie','Approche de Saint-Malo','Cale de Dinan'][i]??'Saint-Malo'})),
    comments:{...base.comments,
      preparation:'Service Saint-Malo ↔ Dinard en continu. Chaque escale prépare automatiquement la traversée suivante.',
      boarding:`Embarquement pour ${outbound?'Dinard':'Saint-Malo'}. Les amarres restent en place.`,
      departure:'Embarquement terminé. Vous pouvez prolonger l’escale ; larguez les amarres quand vous souhaitez repartir.',
      crossing:`Cap sur ${outbound?'Dinard':'Saint-Malo'}. Croisière conseillée : 17 nd. Votre trajectoire reste libre.`,
      approach:`Approche de ${destination.name}. Réduisez la vitesse et rejoignez le repère ocre.`,
      unloading:`Accostage réussi à ${outbound?'Dinard':'Saint-Malo'}. Débarquement, puis embarquement du retour.`,
    }};
}

/** Owns rotations and accounting only. It never owns or changes the vessel's position. */
export class FerryService {
  mission:Mission;
  readonly state:ServiceSnapshot;
  result:ServiceResult|undefined;
  constructor(snapshot?:ServiceSnapshot,leg?:MissionSnapshot){
    this.state=snapshot?structuredClone(snapshot):{
      runId:leg?`service-${leg.runId}`:globalThis.crypto?.randomUUID?.()??`service-${Date.now()}-${Math.random()}`,completed:0,transported:0,
      elapsed:leg?.elapsed??0,accountedSeconds:leg?.accountedSeconds??0,satisfactionTotal:0,dockingTotal:0,approachContacts:0,currentDockQuality:null,
    };
    this.mission=new Mission(serviceDefinition(this.state.completed),leg,true);
  }
  get originPort():'malo'|'dinard' {return this.state.completed%2===0?'malo':'dinard';}
  get destinationPort():'malo'|'dinard' {return this.originPort==='malo'?'dinard':'malo';}
  get destinationName():string {return this.destinationPort==='malo'?'Saint-Malo':'Dinard';}
  dock(t:Telemetry):boolean {
    if(!this.mission.dock(t))return false;
    const incidents=Math.max(0,this.mission.state.metrics.contacts-this.state.approachContacts);
    this.state.currentDockQuality=clamp(100-20*t.speed/KNOT/dockingRules(this.mission.definition).speedKnots-incidents*20,0,100);
    return true;
  }
  update(dt:number,t:Telemetry,satisfaction:number):MissionResult|undefined {
    if(this.result||this.mission.phase==='preparation')return;
    this.state.elapsed+=dt;
    const previous=this.mission.phase,contacts=this.mission.state.metrics.contacts;
    this.mission.update(dt,t);
    if(previous==='crossing'&&this.mission.phase==='approach')this.state.approachContacts=contacts;
    if(this.mission.phase!=='complete'||!this.mission.result)return;
    const result=this.mission.result;
    this.state.completed++;this.state.transported+=result.passengers;
    this.state.satisfactionTotal+=clamp(satisfaction,0,100)*result.passengers;
    this.state.dockingTotal+=this.state.currentDockQuality??clamp(100-result.metrics.contacts*20,0,100);
    this.state.accountedSeconds+=result.playedSeconds;
    this.state.approachContacts=0;this.state.currentDockQuality=null;
    this.mission=new Mission(serviceDefinition(this.state.completed),undefined,true);
    this.mission.board();
    return result;
  }
  finish():ServiceResult {
    if(this.result)return this.result;
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
  return typeof s.runId==='string'&&s.runId.length>0&&s.runId.length<200&&finite(s.completed,1e9)&&Number.isInteger(s.completed)
    &&finite(s.transported,s.completed*BOAT.passengers)&&Number.isInteger(s.transported)&&s.transported>=s.completed*140
    &&finite(s.elapsed)&&finite(s.accountedSeconds,s.elapsed+1e-6)&&finite(s.satisfactionTotal,s.transported*100)
    &&finite(s.dockingTotal,s.completed*100)&&finite(s.approachContacts)&&Number.isInteger(s.approachContacts)
    &&(s.currentDockQuality===null||finite(s.currentDockQuality,100));
}
