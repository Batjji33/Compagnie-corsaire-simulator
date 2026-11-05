import assert from 'node:assert/strict';import test from 'node:test';
import { IncidentEngine } from '../src/incidents/IncidentEngine.ts';
import { INCIDENT_DEFINITIONS,INCIDENT_SCENARIOS } from '../src/incidents/definitions.ts';
import type { IncidentContext,IncidentKind } from '../src/incidents/definitions.ts';
import { ChannelNavigation } from '../src/core/ChannelNavigation.ts';
import { saveVoyage,restoreVoyage } from '../src/saves/ChannelVoyageSave.ts';
const context=(overrides:Partial<IncidentContext>={}):IncidentContext=>({x:10000,z:-60000,zone:'offshore',speed:1,wind:12,waves:2,traffic:3,risk:true,thermalKW:10000,soc:.2,shore:false,...overrides});
const tick=(e:IncidentEngine,seconds:number,c=context())=>{for(let i=0;i<seconds*10;i++)e.step(.1,c);};
function complete(e:IncidentEngine,id:number,c=context()){
 for(let i=0;i<10;i++){const existing=e.state.tasks.find(t=>t.incident===id);if(existing)tick(e,existing.duration-existing.elapsed+1,c);const a=e.state.active.find(a=>a.id===id);if(!a)return;const ch=e.choices(a).find(ch=>e.gate(ch,a,c))!;assert.ok(ch);assert.ok(e.assign(id,ch.id,c));tick(e,ch.seconds*1.4+1,c);}
 assert.fail('scenario did not finish');
}
test('all incident categories have contextual choices and can finish without a permanent lock',()=>{
 for(const d of INCIDENT_DEFINITIONS){const e=new IncidentEngine(42);e.state.frequency='off';const c=context(d.id==='port'||d.id==='strike'||d.id==='pleasure'?{zone:'port'}:{}),a=e.start(d.id,c,true);assert.ok(a,d.id);complete(e,a.id,c);assert.equal(e.state.tasks.length,0);assert.equal(e.state.history.length,1);}
});
test('context and incompatibilities exclude unsuitable incidents',()=>{
 const e=new IncidentEngine();assert.equal(e.start('storm',context({zone:'port'})),undefined);assert.equal(e.start('engine',context({thermalKW:0,shore:true})),undefined);
 assert.ok(e.start('fire',context(),true));assert.equal(e.start('helicopter',context(),true),undefined);assert.equal(e.start('engine',context(),true),undefined);
 const f=new IncidentEngine();assert.equal(f.start('pleasure',context({zone:'port',traffic:0})),undefined);
});
test('simultaneous crew assignments respect exclusive teams and release resources at each stage',()=>{
 const e=new IncidentEngine();e.state.frequency='off';const c=context(),engine=e.start('engine',c,true)!,medical=e.start('medical',c,true)!,mob=e.start('mob',c,true)!;
 assert.ok(e.assign(engine.id,'survey',c));assert.ok(e.assign(medical.id,'attend',c));assert.ok(e.assign(mob.id,'mark',c));assert.equal(e.state.tasks.length,3);tick(e,181,c);assert.equal(e.state.tasks.length,0);assert.equal(e.state.active.find(a=>a.id===engine.id)!.stage,1);
});
test('gate changes suspend tasks; recalling permits category-specific fallback',()=>{
 const e=new IncidentEngine();e.state.frequency='off';const c=context(),a=e.start('engine',c,true)!;e.assign(a.id,'survey',c);tick(e,181,c);e.assign(a.id,'repair',c);tick(e,5,context({speed:8}));assert.equal(e.state.tasks[0].elapsed,0);e.recall(a.id);assert.equal(e.state.effects.delay,30);assert.ok(e.assign(a.id,'limited',c));tick(e,241,c);assert.notEqual(e.state.history[0].outcome,'success');assert.ok(e.state.effects.thermal<1);
});
test('overdue emergencies fall back to external support and retain consequences',()=>{
 const e=new IncidentEngine();e.state.frequency='off';e.start('mob',context(),true);tick(e,7201);assert.equal(e.state.active.length,0);assert.equal(e.state.history[0].outcome,'failed');assert.ok(e.state.effects.medicalFollowup>0);assert.ok(e.state.effects.delay>0);
});
test('seeded scenarios and save snapshots reproduce successful, partial and failed interventions',()=>{
 const outcomes=new Set();for(let seed=1;seed<10;seed++){const a=new IncidentEngine(seed*1000);a.state.frequency='off';const c=context(),i=a.start('engine',c,true)!;a.assign(i.id,'survey',c);tick(a,80,c);const b=new IncidentEngine();assert.ok(b.restore(a.snapshot()));complete(a,i.id,c);complete(b,i.id,c);assert.deepEqual(a.snapshot(),b.snapshot());outcomes.add(a.state.history[0].outcome);}assert.equal(outcomes.size,3);
 for(const [id,kinds] of Object.entries(INCIDENT_SCENARIOS)){const e=new IncidentEngine(31);e.state.frequency='off';const c=context(id==='terminal'?{zone:'port',shore:true}:{});for(const kind of kinds)e.start(kind as IncidentKind,c,true);assert.ok(e.state.active.length>=2);}
});
test('quiet periods, disabled frequency and repeat cooldown prevent event spam',()=>{
 const e=new IncidentEngine(15);tick(e,599);assert.equal(e.state.active.length,0);e.state.frequency='off';tick(e,3600);assert.equal(e.state.active.length,0);
 const c=context(),a=e.start('cabin',c,true)!;complete(e,a.id,c);assert.equal(e.start('cabin',c),undefined);assert.ok(e.state.quietUntil>0);
});
test('clock matches at x1/x2/x4/x8 and pause stops task progression',()=>{
 const snapshots=[];for(const rate of [1,2,4,8]){const n=new ChannelNavigation();n.takeHelm();n.incidents.state.frequency='off';const a=n.incidents.start('cabin',n.incidentContext,true)!;n.incidents.assign(a.id,'move',n.incidentContext);n.requestedRate=rate;n.running=true;for(let i=0;i<80/rate;i++)n.advance(.1);n.running=false;const before=n.incidents.snapshot();n.advance(.1);assert.deepEqual(n.incidents.snapshot(),before);snapshots.push(before);}for(const s of snapshots.slice(1))assert.deepEqual(s,snapshots[0]);
});
test('persistent voyage restores crew, consequences, fuel and world position atomically',()=>{
 const entries=new Map<string,string>(),storage={getItem:(k:string)=>entries.get(k)??null,setItem:(k:string,v:string)=>{entries.set(k,v);},removeItem:(k:string)=>{entries.delete(k);}};
 const a=new ChannelNavigation();a.takeHelm();const incident=a.incidents.start('cabin',a.incidentContext,true)!;a.incidents.assign(incident.id,'move',a.incidentContext);a.running=true;for(let i=0;i<20;i++)a.advance(.1);assert.ok(saveVoyage(a,false,storage));const b=new ChannelNavigation();b.takeHelm();assert.ok(restoreVoyage(b,false,storage));assert.deepEqual(b.incidents.snapshot(),a.incidents.snapshot());assert.deepEqual(b.state,a.state);assert.equal(b.running,false);
 const json=JSON.parse([...entries.values()][0]);json.incidents.effects.thermal=-3;storage.setItem([...entries.keys()][0],JSON.stringify(json));const c=new ChannelNavigation(),before=c.incidents.snapshot();assert.equal(restoreVoyage(c,false,storage),false);assert.deepEqual(c.incidents.snapshot(),before);
});
test('incidents change available power, port access and weather rather than only HUD text',()=>{
 const n=new ChannelNavigation();n.takeHelm();assert.ok(n.incidents.start('port',n.incidentContext,true));assert.equal(n.canCharge,false);
 const c=context(),a=n.incidents.start('engine',c,true)!;assert.ok(a);n.running=true;n.advance(.1);assert.ok(n.dynamics.plant.thermalHealth<1);
 const storm=n.incidents.start('storm',c,true);assert.ok(storm);for(let i=0;i<100;i++)n.advance(.1);assert.ok(n.dynamics.weather.waves>n.dynamics.environment.waves);
});

test('spontaneous scheduling is seeded, observes quiet time and never exceeds compatible capacity',()=>{
 const a=new IncidentEngine(11),b=new IncidentEngine(11);a.state.frequency=b.state.frequency='frequent';const c=context();
 for(let i=0;i<90000;i++){a.step(.1,c);b.step(.1,c);assert.ok(a.state.active.length<=3);assert.equal(new Set(a.state.active.map(i=>a.definition(i.kind).group)).size,a.state.active.length);}
 assert.ok(a.state.serial>0);assert.deepEqual(a.snapshot(),b.snapshot());
});
