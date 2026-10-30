import type { Settings } from './settings.ts';
import { loadSettings } from './settings.ts';
import type { MissionResult, MissionSnapshot } from '../missions/Mission.ts';
import type { VesselState, HelmCommand } from '../physics/VesselDynamics.ts';
import { SEA } from '../weather/Marine.ts';
import type { SeaState } from '../weather/Marine.ts';
import { defaultAudio,readAudio } from '../audio/MaritimeAudio.ts';
import type { AudioSettings } from '../audio/MaritimeAudio.ts';
import { DEFAULT_COMMENTS,validateComment } from '../excursions/comments.ts';
import type { TourComment } from '../excursions/comments.ts';
import type { PassengerSnapshot } from '../passengers/Passengers.ts';
import { validService } from '../missions/FerryService.ts';
import type { ServiceSnapshot, ServiceResult } from '../missions/FerryService.ts';
import { BOAT } from '../ships/parameters.ts';

export interface MarineSettings {sea:SeaState;targetDirection:number;hour:number;tidePhase:number;evolving:boolean;dayCycle:boolean;tideCycle:boolean;damageEnabled:boolean;sound:boolean}
export interface SavedRun {missionId:string;mission:MissionSnapshot;vessel:VesselState;command:HelmCommand;marine:MarineSettings;damage:number;passengers?:PassengerSnapshot;tourVisited?:string[];service?:ServiceSnapshot}
export interface ImmersionSettings {audio:AudioSettings;traffic:boolean;automatic:boolean;manual:boolean;muted:boolean;comments:TourComment[]}
export const defaultImmersion=():ImmersionSettings=>({audio:defaultAudio(),traffic:true,automatic:true,manual:true,muted:false,comments:structuredClone(DEFAULT_COMMENTS)});
export type InstrumentLayout=Record<string,{visible:boolean;left:number|null;top:number|null}>;
export interface GameData {
  settings:Settings;marine:MarineSettings;active:SavedRun|null;
  stats:{completed:number;failed:number;passengers:number;seconds:number;freeSeconds:number;freeDistance:number;best:number};
  history:MissionResult[];
  services:ServiceResult[];
  instruments:InstrumentLayout;
  immersion:ImmersionSettings;
}
export const defaultMarine=():MarineSettings=>({sea:'belle',targetDirection:250,hour:14,tidePhase:0,evolving:true,dayCycle:true,tideCycle:true,damageEnabled:true,sound:true});
export function freshData():GameData {return {settings:loadSettings(),marine:defaultMarine(),active:null,stats:{completed:0,failed:0,passengers:0,seconds:0,freeSeconds:0,freeDistance:0,best:0},history:[],services:[],instruments:{},immersion:defaultImmersion()};}
export function validServiceResult(value:unknown):value is ServiceResult {
  if(!value||typeof value!=='object')return false;
  const r=value as ServiceResult;
  return typeof r.runId==='string'&&r.runId.length>0&&finite(r.completed,0,1e9)&&Number.isInteger(r.completed)
    &&finite(r.transported,0,r.completed*BOAT.passengers)&&Number.isInteger(r.transported)&&finite(r.elapsed,0,1e12)
    &&finite(r.playedSeconds,0,r.elapsed+1e-6)&&typeof r.finishedAt==='string'
    &&(r.satisfaction===null||finite(r.satisfaction,0,100))&&(r.dockingQuality===null||finite(r.dockingQuality,0,100));
}
export function recordServiceResult(data:GameData,result:ServiceResult):boolean {
  if(data.services.some(r=>r.runId===result.runId))return false;
  data.services.unshift(structuredClone(result));data.services.length=Math.min(100,data.services.length);
  // Completed legs already own their crossings, passengers and time in the global statistics.
  data.stats.seconds+=result.playedSeconds;
  return true;
}
export function recordResult(data:GameData,result:MissionResult):boolean {
  if(data.history.some(r=>r.runId===result.runId))return false;
  data.history.unshift(structuredClone(result));data.history.length=Math.min(100,data.history.length);
  data.stats[result.completed?'completed':'failed']++;
  data.stats.passengers+=result.passengers;data.stats.seconds+=result.playedSeconds??result.elapsed;
  if(result.completed)data.stats.best=Math.max(data.stats.best,result.score);
  return true;
}
const finite=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export function readMarine(value:unknown):MarineSettings {
  const defaults=defaultMarine();if(!value||typeof value!=='object')return defaults;
  const v=value as Record<string,unknown>;
  if(typeof v.sea==='string'&&Object.hasOwn(SEA,v.sea))defaults.sea=v.sea as SeaState;
  for(const [key,min,max] of [['targetDirection',0,359],['hour',0,24],['tidePhase',0,Math.PI*2]] as const)if(finite(v[key],min,max))defaults[key]=v[key];
  for(const key of ['evolving','dayCycle','tideCycle','damageEnabled','sound'] as const)if(typeof v[key]==='boolean')defaults[key]=v[key];
  return defaults;
}
export function validRun(v:unknown):v is SavedRun {
  if(!v||typeof v!=='object')return false;
  const a=v as SavedRun,s=a.mission;
  if(typeof a.missionId!=='string'||!s||typeof s.runId!=='string'||!['boarding','departure','crossing','approach','docking','unloading'].includes(s.phase))return false;
  if(!['departure','approach'].includes(s.checkpoint)||!s.metrics||!Array.isArray(s.visited)||!s.visited.every(n=>Number.isInteger(n)&&n>=0&&n<100))return false;
  if(![s.elapsed,s.phaseTime,s.hold,s.groundedSeconds,...Object.values(s.metrics)].every(n=>finite(n,0,1e9)))return false;
  if(s.accountedSeconds!==undefined&&!finite(s.accountedSeconds,0,s.elapsed))return false;
  const keys=['contacts','impactDamage','unsafeSeconds','discomfort','recoveries','distance'] as const;
  if(!keys.every(k=>finite(s.metrics[k],0,1e9))||typeof s.released!=='boolean')return false;
  if(!a.vessel||!a.command||!a.marine||!finite(a.damage,0,1))return false;
  if(a.passengers&&(!finite(a.passengers.satisfaction,0,100)||!finite(a.passengers.discomfort,0,1e9)))return false;
  if(a.tourVisited&&(!Array.isArray(a.tourVisited)||a.tourVisited.length>50||!a.tourVisited.every(id=>typeof id==='string'&&id.length<=100)))return false;
  if(a.service!==undefined&&(!validService(a.service)||a.missionId!=='malo-dinard'||a.service.elapsed+1e-6<s.elapsed||a.service.approachContacts>s.metrics.contacts))return false;
  for(const key of ['x','z','heading','surge','sway','yawRate','port','starboard','rudder'] as const)if(!finite(a.vessel[key],-1e6,1e6))return false;
  return ['port','starboard','rudder'].every(k=>finite(a.command[k as keyof HelmCommand],-1,1));
}
/** Single IndexedDB profile, serialized writes; unavailability keeps a playable session. */
export class GameStore {
  data=freshData();available=true;
  private db:IDBDatabase|undefined;
  private queue:Promise<void>=Promise.resolve();
  async load():Promise<GameData> {
    try {
      this.db=await new Promise<IDBDatabase>((resolve,reject)=>{
        const request=indexedDB.open('corsaire.game',1);
        const timer=setTimeout(()=>reject(new Error('Stockage indisponible')),4000);
        request.onupgradeneeded=()=>request.result.createObjectStore('profile');
        request.onsuccess=()=>{clearTimeout(timer);resolve(request.result);};
        request.onerror=()=>{clearTimeout(timer);reject(request.error);};
        request.onblocked=()=>{clearTimeout(timer);reject(new Error('Stockage occupé'));};
      });
      this.db.onversionchange=()=>{this.db?.close();this.available=false;};
      const raw=await new Promise<unknown>((resolve,reject)=>{
        const request=this.db!.transaction('profile').objectStore('profile').get('main');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
      });
      if(raw&&typeof raw==='object'){
        const v=raw as Partial<GameData>;
        if(v.settings){this.data.settings.quality=['low','medium','high'].includes(v.settings.quality)?v.settings.quality:'low';this.data.settings.showFps=v.settings.showFps===true;}
        this.data.marine=readMarine(v.marine);
        if(v.immersion&&typeof v.immersion==='object'){
          const i=v.immersion;this.data.immersion.audio=readAudio(i.audio);
          for(const key of ['traffic','automatic','manual','muted'] as const)if(typeof i[key]==='boolean')this.data.immersion[key]=i[key];
          if(Array.isArray(i.comments)){
            const comments=i.comments.slice(0,50).map(validateComment).filter((c):c is TourComment=>!!c);
            if(comments.length)this.data.immersion.comments=comments.filter((c,index)=>comments.findIndex(other=>other.id===c.id)===index);
          }
        }
        if(v.instruments&&typeof v.instruments==='object')for(const key of ['marine-navigation','marine-radar','bay-map']){
          const entry=v.instruments[key];if(entry&&typeof entry.visible==='boolean'&&(entry.left===null||finite(entry.left,0,15000))&&(entry.top===null||finite(entry.top,0,15000)))this.data.instruments[key]=entry;
        }
        if(validRun(v.active))this.data.active=v.active;
        if(v.stats)for(const k of Object.keys(this.data.stats) as (keyof GameData['stats'])[])if(finite(v.stats[k],0,1e12))this.data.stats[k]=v.stats[k];
        if(Array.isArray(v.history))this.data.history=v.history.filter(r=>r&&typeof r.runId==='string'&&typeof r.missionId==='string'&&typeof r.completed==='boolean'&&finite(r.score,0,100)&&finite(r.elapsed,0,1e9)&&typeof r.grade==='string').slice(0,100);
        if(Array.isArray(v.services))this.data.services=v.services.filter(validServiceResult).slice(0,100);
      }
    }catch{this.available=false;}
    return this.data;
  }
  save():Promise<void> {
    const snapshot=structuredClone(this.data);
    this.queue=this.queue.then(async()=>{
      if(!this.db||!this.available)return;
      try{await new Promise<void>((resolve,reject)=>{
        const tx=this.db!.transaction('profile','readwrite');tx.objectStore('profile').put(snapshot,'main');
        tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
      });}catch{this.available=false;}
    });
    return this.queue;
  }
  close():void {void this.queue.finally(()=>this.db?.close());}
}
