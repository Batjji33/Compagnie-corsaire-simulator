import { INCIDENT_DEFINITIONS,TEAM_LABELS } from './definitions.ts';
import type { IncidentKind,IncidentContext,IncidentDefinition,TeamId,Choice } from './definitions.ts';
export type Outcome='success'|'partial'|'failed';
export interface Evacuation {total:number;transferred:number;byAir:number;bySea:number;}
export interface Incident {id:number;kind:IncidentKind;started:number;stage:number;partial:boolean;marker:{x:number;z:number};evacuation?:Evacuation;}
export interface CrewTask {incident:number;choice:string;team:TeamId;elapsed:number;duration:number;evacuationStart?:number;}
export interface IncidentRecord {kind:IncidentKind;at:number;outcome:Outcome;}
export interface IncidentState {version:1;time:number;seed:number;serial:number;nextCheck:number;quietUntil:number;frequency:'off'|'rare'|'normal'|'frequent';difficulty:'easy'|'normal'|'hard';active:Incident[];tasks:CrewTask[];history:IncidentRecord[];effects:{thermal:number;electric:number;steering:number;evacuated:number;delay:number;tension:number;medicalFollowup:number;cabinsClosed:number};last:Partial<Record<IncidentKind,number>>;}
export class IncidentEngine {
 readonly state:IncidentState;
 constructor(seed=1561){this.state={version:1,time:0,seed:seed>>>0,serial:0,nextCheck:30,quietUntil:600,frequency:'normal',difficulty:'normal',active:[],tasks:[],history:[],effects:{thermal:1,electric:1,steering:1,evacuated:0,delay:0,tension:0,medicalFollowup:0,cabinsClosed:0},last:{}};}
 definition(kind:IncidentKind):IncidentDefinition {return INCIDENT_DEFINITIONS.find(d=>d.id===kind)!;}
 private random():number {this.state.seed=(Math.imul(this.state.seed,1664525)+1013904223)>>>0;return this.state.seed/4294967296;}
 eligible(kind:IncidentKind,c:IncidentContext):boolean{
  const s=this.state,d=this.definition(kind);return !!d&&s.active.length<3&&!s.active.some(a=>a.kind==='evacuation')&&(kind!=='evacuation'||s.active.length===0)&&!s.active.some(a=>this.definition(a.kind).group===d.group)&&d.eligible(c,s.active.map(a=>a.kind));
 }
 start(kind:IncidentKind,c:IncidentContext,scripted=false):Incident|undefined {
  const s=this.state;if(!this.eligible(kind,c)||!scripted&&s.time-(s.last[kind]??-10000)<5400)return;
  const a:Incident={id:++s.serial,kind,started:s.time,stage:0,partial:false,marker:{x:c.x+150,z:c.z+150}};
  if(kind==='evacuation')a.evacuation={total:Math.floor(c.passengers??420),transferred:0,byAir:0,bySea:0};
  s.active.push(a);s.last[kind]=s.time;
  s.quietUntil=s.time+(s.frequency==='frequent'?240:s.frequency==='rare'?1800:900);s.effects.tension=Math.min(100,s.effects.tension+this.definition(kind).severity*4);return a;
 }
 choices(a:Incident):readonly Choice[]{return this.definition(a.kind).steps[a.stage].choices;}
 gate(choice:Choice,a:Incident,c:IncidentContext):boolean{
  switch(choice.gate){case 'slow':return Math.abs(c.speed)<3;case 'stopped':return Math.abs(c.speed)<.3;case 'flight':return c.wind<25&&c.waves<3&&Math.abs(c.speed)<3&&c.zone!=='port';case 'rescue':return Math.abs(c.speed)<1.5&&c.waves<4&&c.zone!=='port';case 'near-marker':return Math.hypot(c.x-a.marker.x,c.z-a.marker.z)<400&&Math.abs(c.speed)<2;default:return true;}
 }
 gateHint(choice:Choice):string {switch(choice.gate){case 'slow':return 'Vitesse inférieure à 3 m/s';case 'stopped':return 'Vitesse inférieure à 0,3 m/s';case 'flight':return 'Hors port, vitesse <3 m/s, vent <25 nd et houle <3 m';case 'rescue':return 'Hors port, vitesse <1,5 m/s et houle <4 m';case 'near-marker':return 'À moins de 400 m du marqueur, vitesse <2 m/s';default:return '';}}
 assign(id:number,choiceId:string,c:IncidentContext):boolean {
  const s=this.state,a=s.active.find(a=>a.id===id),ch=a&&this.choices(a).find(ch=>ch.id===choiceId);
  if(!a||!ch||s.tasks.some(t=>t.team===ch.team||t.incident===id)||!this.gate(ch,a,c))return false;
  const factor=s.difficulty==='hard'?1.4:s.difficulty==='easy'?.75:1;
  const task:CrewTask={incident:id,choice:choiceId,team:ch.team,elapsed:0,duration:ch.seconds*factor};
  if(a.evacuation)task.evacuationStart=a.evacuation.transferred;
  s.tasks.push(task);return true;
 }
 recall(id:number):void {const s=this.state;if(s.tasks.some(t=>t.incident===id)){s.tasks=s.tasks.filter(t=>t.incident!==id);s.effects.delay+=30;}}
 teamStatus(team:TeamId):CrewTask|undefined{return this.state.tasks.find(t=>t.team===team);}
 private transfer(a:Incident,target:number,air=false):void {
  const e=a.evacuation;if(!e)return;
  const count=Math.max(0,Math.min(e.total,Math.floor(target))-e.transferred);
  e.transferred+=count;if(air)e.byAir+=count;else e.bySea+=count;this.state.effects.evacuated+=count;
 }
 private finish(a:Incident,forced?:Outcome):void{
  const s=this.state,roll=this.random(),failure=s.difficulty==='hard'?.16:s.difficulty==='easy'?.03:.08;
  const outcome=forced??(roll<failure?'failed':a.partial||roll<.3?'partial':'success'),partial=outcome!=='success',bad=outcome==='failed';
  if(['engine','cooling','flooding'].includes(a.kind)&&partial)s.effects.thermal=Math.max(.55,s.effects.thermal-(bad?.2:.1));
  if(['electrical','radar'].includes(a.kind)&&partial)s.effects.electric=Math.max(.55,s.effects.electric-(bad?.2:.1));
  if(a.kind==='steering'&&partial)s.effects.steering=Math.max(.55,s.effects.steering-(bad?.2:.1));
  if(a.kind==='fire'){s.effects.thermal=Math.max(.55,s.effects.thermal-(bad?.2:.05));s.effects.delay+=600;}
  if(['medical','helicopter','mob','medicalBoat','distress','evacuation'].includes(a.kind))s.effects.medicalFollowup++;
  if(['cabin','galley','flooding'].includes(a.kind)&&partial)s.effects.cabinsClosed++;
  // Even a timed-out evacuation hands every remaining passenger to external support.
  if(a.evacuation){this.transfer(a,a.evacuation.total);s.effects.delay+=1800;}
  if(['cargo','pollution','missing'].includes(a.kind)&&partial)s.effects.delay+=600;
  s.effects.delay+=(partial?300:60)*this.definition(a.kind).severity;
  s.effects.tension=Math.max(0,Math.min(100,s.effects.tension+(bad?10:partial?2:-4)));
  s.history.unshift({kind:a.kind,at:s.time,outcome});s.history.length=Math.min(s.history.length,40);s.active=s.active.filter(b=>b.id!==a.id);s.tasks=s.tasks.filter(t=>t.incident!==a.id);
 }
 step(dt:number,c:IncidentContext):void{
  if(!Number.isFinite(dt)||dt<=0||dt>.1)throw new Error('Incident step must be in (0,.1]');
  const s=this.state;s.time+=dt;
  for(const task of [...s.tasks]){
   const a=s.active.find(a=>a.id===task.incident);if(!a)continue;const ch=this.choices(a).find(ch=>ch.id===task.choice)!;
   if(!this.gate(ch,a,c))continue;task.elapsed+=dt;
   if(a.evacuation&&['rescue-flight','lifeboats','offshore-support'].includes(ch.id)){
    const air=ch.id==='rescue-flight',target=air?Math.min(12,a.evacuation.total):a.evacuation.total,start=task.evacuationStart!;
    this.transfer(a,start+(target-start)*Math.min(1,(task.elapsed+1e-7)/task.duration),air);
   }
   if(task.elapsed+1e-7>=task.duration){a.partial ||= !!ch.partial;s.tasks=s.tasks.filter(t=>t!==task);a.stage++;if(a.stage>=this.definition(a.kind).steps.length)this.finish(a);}
  }
  // External support closes overdue scenarios with lasting penalties, never a permanent soft lock.
  for(const a of [...s.active])if(s.time-a.started>7200)this.finish(a,'failed');
  if(s.time+1e-7<s.nextCheck)return;s.nextCheck+=30;
  if(s.frequency==='off'||s.time<s.quietUntil)return;
  const chance=s.frequency==='frequent'?.45:s.frequency==='rare'?.03:.15;if(this.random()>chance)return;
  const available=INCIDENT_DEFINITIONS.filter(d=>this.eligible(d.id,c)&&s.time-(s.last[d.id]??-10000)>=5400);
  const weights=available.map(d=>d.weight*(s.active.some(a=>a.kind==='storm')&&(d.id==='engine'||d.id==='medical')?4:1));
  let target=this.random()*weights.reduce((sum,w)=>sum+w,0);for(let i=0;i<available.length;i++){target-=weights[i];if(target<=0){this.start(available[i].id,c);break;}}
 }
 get modifiers(){const s=this.state;return {thermal:Math.max(.45,s.effects.thermal-(s.active.some(a=>['engine','fire','flooding','cooling'].includes(a.kind))?.25:0)),electric:Math.max(.45,s.effects.electric-(s.active.some(a=>a.kind==='electrical'||a.kind==='radar')?.25:0)),steering:Math.max(.45,s.effects.steering-(s.active.some(a=>a.kind==='steering')?.55:0)),radarUnavailable:s.active.some(a=>a.kind==='radar'),evacuating:s.active.some(a=>a.kind==='evacuation'),storm:s.active.some(a=>a.kind==='storm'),portBlocked:s.active.some(a=>a.kind==='port'||a.kind==='strike'),trafficAssistance:s.active.some(a=>a.kind==='pleasure'&&s.tasks.some(t=>t.incident===a.id&&t.choice==='harbour'))};}
 snapshot():IncidentState{return structuredClone(this.state);}
 restore(value:unknown):boolean {
  try{const v=structuredClone(value) as IncidentState;
   // Version-one voyages saved before the expanded catalogue have no evacuation or steering effects.
   if(v.effects.steering===undefined)v.effects.steering=1;if(v.effects.evacuated===undefined)v.effects.evacuated=0;
   if(v.version!==1||!Number.isFinite(v.time)||v.time<0||!Number.isInteger(v.seed)||!Number.isInteger(v.serial)||v.serial<0||!Number.isFinite(v.nextCheck)||!Number.isFinite(v.quietUntil)||!['off','rare','normal','frequent'].includes(v.frequency)||!['easy','normal','hard'].includes(v.difficulty)||v.active.length>3||v.tasks.length>3||v.history.length>40)return false;
   if(v.active.some(a=>!this.definition(a.kind)||!Number.isInteger(a.id)||a.id<1||a.id>v.serial||!Number.isInteger(a.stage)||a.stage<0||a.stage>=this.definition(a.kind).steps.length||!Number.isFinite(a.started)||a.started>v.time||!Number.isFinite(a.marker.x)||!Number.isFinite(a.marker.z)))return false;
   if(new Set(v.active.map(a=>this.definition(a.kind).group)).size!==v.active.length||new Set(v.active.map(a=>a.id)).size!==v.active.length||new Set(v.tasks.map(t=>t.team)).size!==v.tasks.length||new Set(v.tasks.map(t=>t.incident)).size!==v.tasks.length)return false;
   if(v.active.some(a=>{const e=a.evacuation;if(a.kind!=='evacuation')return e!==undefined;return v.active.length!==1||!e||![e.total,e.transferred,e.byAir,e.bySea].every(Number.isInteger)||e.total<1||e.total>1290||e.transferred<0||e.transferred>e.total||e.byAir<0||e.byAir>Math.min(12,e.total)||e.bySea<0||e.byAir+e.bySea!==e.transferred||e.transferred>v.effects.evacuated||a.stage<3&&e.transferred>0||a.stage===3&&e.bySea>0||a.stage===5&&e.transferred!==e.total;}))return false;
   if(v.tasks.some(t=>{const a=v.active.find(a=>a.id===t.incident),ch=a&&this.choices(a).find(c=>c.id===t.choice);return !ch||ch.team!==t.team||!Number.isFinite(t.elapsed)||!Number.isFinite(t.duration)||t.duration<=0||t.duration>10000||t.elapsed<0||t.elapsed>t.duration||(a?.evacuation? !Number.isInteger(t.evacuationStart)||t.evacuationStart!<0||t.evacuationStart!>a.evacuation.transferred:t.evacuationStart!==undefined);} ))return false;
   if(!v.effects||!v.last||['thermal','electric','steering','evacuated','delay','tension','medicalFollowup','cabinsClosed'].some(k=>!Number.isFinite((v.effects as unknown as Record<string,number>)[k]))||Object.entries(v.last).some(([k,n])=>!this.definition(k as IncidentKind)||!Number.isFinite(n)||n>v.time)||Object.values(v.effects).some(n=>!Number.isFinite(n)||n<0)||v.effects.thermal<.45||v.effects.thermal>1||v.effects.electric<.45||v.effects.electric>1||v.effects.tension>100||v.history.some(h=>!this.definition(h.kind)||!['success','partial','failed'].includes(h.outcome)||!Number.isFinite(h.at)))return false;
   if(!Number.isInteger(v.effects.evacuated)||v.effects.steering<.45||v.effects.steering>1)return false;
   Object.assign(this.state,v);return true;
  }catch{return false;}
 }
 get teamLabels(){return TEAM_LABELS;}
}
