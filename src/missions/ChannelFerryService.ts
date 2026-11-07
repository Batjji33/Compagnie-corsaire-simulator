import { Passengers } from '../passengers/Passengers.ts';
export type FerryPhase='preparation'|'boarding'|'ready'|'crossing'|'unloading'|'complete';
export interface FerryServiceSnapshot {version:1;enabled:boolean;origin:0|1;phase:FerryPhase;moored:boolean;ramp:number;transferTime:number;vehicles:number;passengers:number;evacuated:number;}
/** A modest playable manifest, not a claimed real-world capacity or loading schedule. */
export class ChannelFerryService {
 readonly passengers=new Passengers();
 readonly manifest={passengers:420,vehicles:80};
 state:FerryServiceSnapshot={version:1,enabled:false,origin:0,phase:'preparation',moored:false,ramp:0,transferTime:0,vehicles:0,passengers:0,evacuated:0};
 constructor(){this.passengers.capacity=1290;}
 initialize(origin:0|1):void {this.state={version:1,enabled:true,origin,phase:'preparation',moored:true,ramp:0,transferTime:0,vehicles:0,passengers:0,evacuated:0};this.passengers.reset();}
 get destination():0|1{return this.state.origin===0?1:0;}
 get targetRamp():number{return this.state.moored&&(this.state.phase==='boarding'||this.state.phase==='unloading')?1:0;}
 get immobilized():boolean{return this.state.enabled&&this.state.moored;}
 board(blocked=false):boolean {if(!this.state.enabled||!this.state.moored||this.state.phase!=='preparation'||blocked)return false;this.state.phase='boarding';this.state.transferTime=0;return true;}
 depart(blocked=false,shore=false):boolean{const s=this.state;if(!s.enabled||!s.moored||s.phase!=='ready'||s.ramp>.01||blocked||shore)return false;s.moored=false;s.phase='crossing';return true;}
 unload(blocked=false):boolean{const s=this.state;if(!s.enabled||!s.moored||s.phase!=='crossing'||blocked)return false;s.phase='unloading';s.transferTime=0;return true;}
 evacuate(count:number):void {const s=this.state;if(!s.enabled||s.phase!=='crossing'||s.moored)return;const moved=Math.min(s.passengers,Math.max(0,Math.floor(count)));s.evacuated+=moved;s.passengers-=moved;this.passengers.count=s.passengers;}
 step(dt:number,blocked:boolean,speed:number,yaw:number,waves:number):void {
  const s=this.state;if(!s.enabled)return;
  const target=this.targetRamp;s.ramp+=Math.max(-dt/30,Math.min(dt/30,target-s.ramp));
  if((s.phase==='boarding'||s.phase==='unloading')&&s.ramp>=.999&&!blocked)s.transferTime+=dt;
  const duration=s.phase==='unloading'?240:320;
  const phase=s.phase==='boarding'?'boarding':s.phase==='unloading'?'unloading':s.phase==='ready'||s.phase==='crossing'?'crossing':s.phase==='complete'?'complete':'preparation';
  this.passengers.update(dt,phase,s.transferTime,this.manifest.passengers-s.evacuated,320,240,speed,yaw,waves);s.passengers=this.passengers.count;
  if(s.phase==='boarding')s.vehicles=Math.min(this.manifest.vehicles,Math.floor(this.manifest.vehicles*s.transferTime/duration));
  if(s.phase==='unloading')s.vehicles=Math.max(0,this.manifest.vehicles-Math.floor(this.manifest.vehicles*s.transferTime/duration));
  if(s.transferTime>=duration&&(s.phase==='boarding'||s.phase==='unloading')){s.phase=s.phase==='boarding'?'ready':'complete';s.transferTime=0;}
 }
 snapshot():FerryServiceSnapshot{return {...this.state};}
 static valid(value:unknown):value is FerryServiceSnapshot{
  const s=value as FerryServiceSnapshot;
  if(!s||s.version!==1||typeof s.enabled!=='boolean'||(s.origin!==0&&s.origin!==1)||!['preparation','boarding','ready','crossing','unloading','complete'].includes(s.phase)||typeof s.moored!=='boolean'||!Number.isFinite(s.ramp)||s.ramp<0||s.ramp>1||!Number.isFinite(s.transferTime)||s.transferTime<0||s.transferTime>320||!Number.isInteger(s.vehicles)||s.vehicles<0||s.vehicles>80||!Number.isInteger(s.passengers)||s.passengers<0||s.passengers>420)return false;
  const evacuated=s.evacuated===undefined?0:s.evacuated;
  if(!Number.isInteger(evacuated)||evacuated<0||evacuated>420||s.passengers+evacuated>420||evacuated>0&&!['crossing','unloading','complete'].includes(s.phase))return false;
  if(!s.enabled)return true;
  if(s.phase!=='crossing'&&!s.moored)return false;
  if(s.phase==='preparation'||s.phase==='complete')return s.vehicles===0&&s.passengers===0;
  if(s.phase==='ready'||s.phase==='crossing')return s.vehicles===80&&s.passengers+evacuated===420;
  return true;
 }
 restore(s:FerryServiceSnapshot):void{this.state={...s,evacuated:s.evacuated??0};this.passengers.count=s.passengers;}
}
