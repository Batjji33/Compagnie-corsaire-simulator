import { INCIDENT_DEFINITIONS,TEAM_LABELS } from './definitions.ts';
import type { IncidentKind,IncidentContext,IncidentDefinition,TeamId,Choice } from './definitions.ts';
export type Outcome='success'|'partial'|'failed';
export interface Incident {id:number;kind:IncidentKind;started:number;stage:number;partial:boolean;marker:{x:number;z:number};}
export interface CrewTask {incident:number;choice:string;team:TeamId;elapsed:number;duration:number;}
export interface IncidentRecord {kind:IncidentKind;at:number;outcome:Outcome;}
export interface IncidentState {version:1;time:number;seed:number;serial:number;nextCheck:number;quietUntil:number;frequency:'off'|'rare'|'normal'|'frequent';difficulty:'easy'|'normal'|'hard';active:Incident[];tasks:CrewTask[];history:IncidentRecord[];effects:{thermal:number;electric:number;delay:number;tension:number;medicalFollowup:number;cabinsClosed:number};last:Partial<Record<IncidentKind,number>>;}
export class IncidentEngine {
 readonly state:IncidentState;
 constructor(seed=1561){this.state={version:1,time:0,seed:seed>>>0,serial:0,nextCheck:30,quietUntil:600,frequency:'normal',difficulty:'normal',active:[],tasks:[],history:[],effects:{thermal:1,electric:1,delay:0,tension:0,medicalFollowup:0,cabinsClosed:0},last:{}};}
 definition(kind:IncidentKind):IncidentDefinition {return INCIDENT_DEFINITIONS.find(d=>d.id===kind)!;}
 private random():number {this.state.seed=(Math.imul(this.state.seed,1664525)+1013904223)>>>0;return this.state.seed/4294967296;}
 eligible(kind:IncidentKind,c:IncidentContext):boolean{
  const s=this.state,d=this.definition(kind);return !!d&&s.active.length<3&&!s.active.some(a=>this.definition(a.kind).group===d.group)&&d.eligible(c,s.active.map(a=>a.kind));
 }
 start(kind:IncidentKind,c:IncidentContext,scripted=false):Incident|undefined {
  const s=this.state;if(!this.eligible(kind,c)||!scripted&&s.time-(s.last[kind]??-10000)<5400)return;
  const a:Incident={id:++s.serial,kind,started:s.time,stage:0,partial:false,marker:{x:c.x+150,z:c.z+150}};s.active.push(a);s.last[kind]=s.time;
  s.quietUntil=s.time+(s.frequency==='frequent'?240:s.frequency==='rare'?1800:900);s.effects.tension=Math.min(100,s.effects.tension+this.definition(kind).severity*4);return a;
 }
 choices(a:Incident):readonly Choice[]{return this.definition(a.kind).steps[a.stage].choices;}
 gate(choice:Choice,a:Incident,c:IncidentContext):boolean{
  switch(choice.gate){case 'slow':return Math.abs(c.speed)<3;case 'stopped':return Math.abs(c.speed)<.3;case 'flight':return c.wind<25&&c.waves<3&&Math.abs(c.speed)<3&&c.zone!=='port';case 'near-marker':return Math.hypot(c.x-a.marker.x,c.z-a.marker.z)<400&&Math.abs(c.speed)<2;default:return true;}
 }
 assign(id:number,choiceId:string,c:IncidentContext):boolean {
  const s=this.state,a=s.active.find(a=>a.id===id),ch=a&&this.choices(a).find(ch=>ch.id===choiceId);
  if(!a||!ch||s.tasks.some(t=>t.team===ch.team||t.incident===id)||!this.gate(ch,a,c))return false;
  const factor=s.difficulty==='hard'?1.4:s.difficulty==='easy'?.75:1;
  s.tasks.push({incident:id,choice:choiceId,team:ch.team,elapsed:0,duration:ch.seconds*factor});return true;
 }
 recall(id:number):void {const s=this.state;if(s.tasks.some(t=>t.incident===id)){s.tasks=s.tasks.filter(t=>t.incident!==id);s.effects.delay+=30;}}
 teamStatus(team:TeamId):CrewTask|undefined{return this.state.tasks.find(t=>t.team===team);}
 private finish(a:Incident,forced?:Outcome):void{
  const s=this.state,roll=this.random(),failure=s.difficulty==='hard'?.16:s.difficulty==='easy'?.03:.08;
  const outcome=forced??(roll<failure?'failed':a.partial||roll<.3?'partial':'success'),partial=outcome!=='success',bad=outcome==='failed';
  if(a.kind==='engine'&&partial)s.effects.thermal=Math.max(.55,s.effects.thermal-(bad?.2:.1));
  if(a.kind==='electrical'&&partial)s.effects.electric=Math.max(.55,s.effects.electric-(bad?.2:.1));
  if(a.kind==='fire'){s.effects.thermal=Math.max(.55,s.effects.thermal-(bad?.2:.05));s.effects.delay+=600;}
  if(a.kind==='medical'||a.kind==='helicopter'||a.kind==='mob')s.effects.medicalFollowup++;
  if(a.kind==='cabin'&&partial)s.effects.cabinsClosed++;
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
 get modifiers(){const s=this.state;return {thermal:Math.max(.45,s.effects.thermal-(s.active.some(a=>a.kind==='engine'||a.kind==='fire')?.25:0)),electric:Math.max(.45,s.effects.electric-(s.active.some(a=>a.kind==='electrical')?.25:0)),storm:s.active.some(a=>a.kind==='storm'),portBlocked:s.active.some(a=>a.kind==='port'||a.kind==='strike'),trafficAssistance:s.active.some(a=>a.kind==='pleasure'&&s.tasks.some(t=>t.incident===a.id&&t.choice==='harbour'))};}
 snapshot():IncidentState{return structuredClone(this.state);}
 restore(value:unknown):boolean {
  try{const v=value as IncidentState;if(v.version!==1||!Number.isFinite(v.time)||v.time<0||!Number.isInteger(v.seed)||!Number.isInteger(v.serial)||v.serial<0||!Number.isFinite(v.nextCheck)||!Number.isFinite(v.quietUntil)||!['off','rare','normal','frequent'].includes(v.frequency)||!['easy','normal','hard'].includes(v.difficulty)||v.active.length>3||v.tasks.length>3||v.history.length>40)return false;
   if(v.active.some(a=>!this.definition(a.kind)||!Number.isInteger(a.id)||a.id<1||a.id>v.serial||!Number.isInteger(a.stage)||a.stage<0||a.stage>=this.definition(a.kind).steps.length||!Number.isFinite(a.started)||a.started>v.time||!Number.isFinite(a.marker.x)||!Number.isFinite(a.marker.z)))return false;
   if(new Set(v.active.map(a=>this.definition(a.kind).group)).size!==v.active.length||new Set(v.active.map(a=>a.id)).size!==v.active.length||new Set(v.tasks.map(t=>t.team)).size!==v.tasks.length||new Set(v.tasks.map(t=>t.incident)).size!==v.tasks.length)return false;
   if(v.tasks.some(t=>{const a=v.active.find(a=>a.id===t.incident),ch=a&&this.choices(a).find(c=>c.id===t.choice);return !ch||ch.team!==t.team||!Number.isFinite(t.elapsed)||!Number.isFinite(t.duration)||t.duration<=0||t.duration>10000||t.elapsed<0||t.elapsed>t.duration;}))return false;
   if(!v.effects||!v.last||['thermal','electric','delay','tension','medicalFollowup','cabinsClosed'].some(k=>!Number.isFinite((v.effects as unknown as Record<string,number>)[k]))||Object.entries(v.last).some(([k,n])=>!this.definition(k as IncidentKind)||!Number.isFinite(n)||n>v.time)||Object.values(v.effects).some(n=>!Number.isFinite(n)||n<0)||v.effects.thermal<.45||v.effects.thermal>1||v.effects.electric<.45||v.effects.electric>1||v.effects.tension>100||v.history.some(h=>!this.definition(h.kind)||!['success','partial','failed'].includes(h.outcome)||!Number.isFinite(h.at)))return false;
   const copy=structuredClone(v);Object.assign(this.state,copy);return true;
  }catch{return false;}
 }
 get teamLabels(){return TEAM_LABELS;}
}
