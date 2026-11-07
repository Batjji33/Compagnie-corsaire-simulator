import assert from 'node:assert/strict';
import test from 'node:test';
import { IncidentEngine } from '../src/incidents/IncidentEngine.ts';
import type { Incident,IncidentState } from '../src/incidents/IncidentEngine.ts';
import { INCIDENT_DEFINITIONS } from '../src/incidents/definitions.ts';
import type { IncidentContext } from '../src/incidents/definitions.ts';
import { ChannelNavigation } from '../src/core/ChannelNavigation.ts';
import { ChannelFerryService } from '../src/missions/ChannelFerryService.ts';
import { CHANNEL_LENGTH,routePose } from '../src/world/ChannelGeography.ts';
import { IncidentView } from '../src/world/IncidentView.ts';
import { saveVoyage,restoreVoyage } from '../src/saves/ChannelVoyageSave.ts';
import { FerryDynamics } from '../src/physics/FerryDynamics.ts';

const context=(overrides:Partial<IncidentContext>={}):IncidentContext=>({x:10000,z:-60000,zone:'offshore',speed:1,wind:12,waves:2,traffic:3,risk:true,thermalKW:10000,soc:.2,shore:false,passengers:420,underway:true,...overrides});
function tick(e:IncidentEngine,seconds:number,c=context()){for(let i=0;i<Math.round(seconds*10);i++)e.step(.1,c);}
function action(e:IncidentEngine,a:Incident,id:string,c=context()){
 const ch=e.choices(a).find(ch=>ch.id===id)!;assert.ok(ch,id);assert.ok(e.assign(a.id,id,c),id);tick(e,e.state.tasks[0].duration+.1,c);
}
function evacuation(c=context()){
 const e=new IncidentEngine(42);e.state.frequency='off';const a=e.start('evacuation',c,true)!;assert.ok(a);
 for(const id of ['alert','muster','secure'])action(e,a,id,c);
 return {e,a};
}
function voyage(){
 const n=new ChannelNavigation();n.initializeVoyage(false);n.incidents.state.frequency='off';
 // Loaded, departed fixture in clear offshore water; navigation and transfers still run normally.
 n.service.restore({...n.service.snapshot(),phase:'crossing',moored:false,vehicles:80,passengers:420});
 n.dynamics.reset(routePose(CHANNEL_LENGTH*.45));Object.assign(n.dynamics.environment,{windKnots:0,currentKnots:0,waves:.1});
 return n;
}
function storage(){const entries=new Map<string,string>();return {entries,getItem:(key:string)=>entries.get(key)??null,setItem:(key:string,value:string)=>{entries.set(key,value);},removeItem:(key:string)=>{entries.delete(key);}};}

test('the catalogue doubles to 22 distinct, complete incidents with offshore passenger eligibility',()=>{
 assert.equal(INCIDENT_DEFINITIONS.length,22);assert.equal(new Set(INCIDENT_DEFINITIONS.map(d=>d.id)).size,22);
 for(const d of INCIDENT_DEFINITIONS.slice(11)){
  assert.equal(d.eligible(context({zone:'port'}),[]),false,d.id);
  assert.equal(d.eligible(context({underway:false}),[]),false,d.id);
  assert.equal(d.eligible(context(),[]),true,d.id);
  assert.ok(d.steps.length>=2);
 }
 for(const id of ['evacuation','missing','galley','medicalBoat'] as const)assert.equal(new IncidentEngine().eligible(id,context({passengers:0})),false,id);
 for(const passengers of [.5,NaN,Infinity,1291])assert.equal(new IncidentEngine().eligible('evacuation',context({passengers})),false);
});

test('general evacuation has exclusive priority without displacing an already assigned crew',()=>{
 const e=new IncidentEngine(),c=context();const a=e.start('engine',c,true)!;e.assign(a.id,'survey',c);
 assert.equal(e.start('evacuation',c,true),undefined);assert.equal(e.state.tasks.length,1);
 const f=new IncidentEngine();assert.ok(f.start('evacuation',c,true));
 for(const d of INCIDENT_DEFINITIONS)assert.equal(f.start(d.id,c,true),undefined,d.id);
});

test('each new incident has a way to finish in rough weather at cruising speed',()=>{
 const c=context({wind:35,waves:5,speed:8});
 for(const d of INCIDENT_DEFINITIONS.slice(11)){
  const e=new IncidentEngine(42);e.state.frequency='off';e.state.difficulty='hard';const a=e.start(d.id,c,true)!;assert.ok(a,d.id);
  for(let stage=0;stage<d.steps.length;stage++){
   const ch=e.choices(a).find(ch=>e.gate(ch,a,c));assert.ok(ch,d.id);action(e,a,ch.id,c);
  }
  assert.equal(e.state.active.length,0,d.id);assert.equal(e.state.tasks.length,0,d.id);
 }
});

test('air and sea transfers progressively evacuate exactly the manifest, including small groups',()=>{
 for(const total of [1,7,37,420]){
  const c=context({passengers:total}),{e,a}=evacuation(c);
  assert.ok(e.assign(a.id,'rescue-flight',c));tick(e,210,c);
  assert.equal(a.evacuation!.transferred,Math.floor(Math.min(12,total)/2));
  tick(e,210.1,c);assert.equal(a.evacuation!.byAir,Math.min(12,total));
  assert.ok(e.assign(a.id,'lifeboats',c));tick(e,360,c);
  assert.equal(a.evacuation!.transferred,Math.min(12,total)+Math.floor(Math.max(0,total-12)/2));
  tick(e,360.1,c);action(e,a,'account',c);
  assert.equal(e.state.effects.evacuated,total);assert.equal(a.evacuation!.byAir+a.evacuation!.bySea,total);
  assert.equal(e.state.active.length,0);assert.equal(e.state.tasks.length,0);assert.equal(e.state.effects.medicalFollowup,1);
 }
});

test('weather pauses air and boat transfers and explicit alternatives remain available',()=>{
 const {e,a}=evacuation(),c=context();e.assign(a.id,'rescue-flight',c);tick(e,105,c);
 const before=e.snapshot();tick(e,60,context({wind:30}));assert.deepEqual(e.state.tasks,before.tasks);assert.deepEqual(a.evacuation,before.active[0].evacuation);
 e.recall(a.id);action(e,a,'sea-priority',context({wind:30,waves:5,speed:5}));
 assert.equal(e.assign(a.id,'lifeboats',context({waves:5})),false);
 action(e,a,'offshore-support',context({wind:30,waves:5,speed:5}));action(e,a,'account',c);
 assert.equal(e.state.effects.evacuated,420);assert.notEqual(e.state.history[0].outcome,'success');
 const f=evacuation();action(f.e,f.a,'sea-priority');f.e.assign(f.a.id,'lifeboats',c);tick(f.e,180,c);
 const stopped=f.e.snapshot();tick(f.e,100,context({speed:2}));assert.deepEqual(f.e.state.tasks,stopped.tasks);assert.deepEqual(f.a.evacuation,stopped.active[0].evacuation);
});

test('recalling and restoring a transfer preserves the baseline and never evacuates a passenger twice',()=>{
 const {e,a}=evacuation(),c=context();e.assign(a.id,'rescue-flight',c);tick(e,210);e.recall(a.id);
 assert.equal(a.evacuation!.byAir,6);assert.ok(e.assign(a.id,'rescue-flight',c));tick(e,210);
 const copy=new IncidentEngine();assert.ok(copy.restore(e.snapshot()));
 for(const engine of [e,copy]){tick(engine,210.1);const active=engine.state.active[0];action(engine,active,'lifeboats');action(engine,active,'account');}
 assert.deepEqual(e.snapshot(),copy.snapshot());assert.equal(e.state.effects.evacuated,420);assert.equal(a.evacuation!.byAir,12);
});

test('overdue evacuation hands remaining passengers to external boats and frees all teams',()=>{
 const {e,a}=evacuation();e.assign(a.id,'rescue-flight',context());tick(e,210);e.recall(a.id);tick(e,7201);
 assert.equal(e.state.active.length,0);assert.equal(e.state.tasks.length,0);assert.equal(e.state.history[0].outcome,'failed');
 assert.equal(e.state.effects.evacuated,420);assert.equal(a.evacuation!.byAir,6);assert.equal(a.evacuation!.bySea,414);
});

test('evacuation progress is identical at every time rate, and navigation pause preserves the manifest',()=>{
 const snapshots=[];
 for(const rate of [1,2,4,8]){
  const n=voyage(),c=n.incidentContext,a=n.incidents.start('evacuation',c,true)!;
  for(const id of ['alert','muster','secure'])action(n.incidents,a,id,c);
  n.incidents.assign(a.id,'rescue-flight',c);n.requestedRate=rate;n.running=true;
  for(let i=0;i<800/rate;i++)n.advance(.1);
  assert.equal(n.service.state.evacuated,2);assert.equal(n.service.state.passengers,418);
  n.running=false;const before=[n.incidents.snapshot(),n.service.snapshot()];n.advance(.1);assert.deepEqual([n.incidents.snapshot(),n.service.snapshot()],before);snapshots.push(before);
 }
 for(const s of snapshots.slice(1))assert.deepEqual(s,snapshots[0]);
});

test('a fully evacuated ferry can dock and unload vehicles without repopulating its passenger manifest',()=>{
 const n=voyage(),a=n.incidents.start('evacuation',n.incidentContext,true)!;
 n.incidents.state.time=a.started+7200;n.running=true;n.advance(.1);
 assert.equal(n.service.state.passengers,0);assert.equal(n.service.state.evacuated,420);assert.equal(n.service.state.vehicles,80);
 assert.equal(n.incidents.start('medicalBoat',n.incidentContext,true),undefined);
 const b=n.destination;n.dynamics.reset({x:b.point[0]+2,z:b.point[1],heading:b.heading});n.dynamics.groundSpeed=0;
 assert.ok(n.moor());assert.ok(n.service.unload());
 for(let i=0;i<3100;i++)n.advance(.1);
 assert.equal(n.service.state.phase,'complete');assert.equal(n.service.state.passengers,0);assert.equal(n.service.state.vehicles,0);assert.equal(n.service.state.evacuated,420);
 assert.ok(n.prepareReturn());assert.equal(n.service.state.evacuated,0);assert.equal(n.incidents.state.effects.evacuated,420);
});

test('saving during an air transfer restores matching manifest counts and subsequent transfers once',()=>{
 const n=voyage(),a=n.incidents.start('evacuation',n.incidentContext,true)!;
 for(const id of ['alert','muster','secure'])action(n.incidents,a,id,n.incidentContext);
 n.incidents.assign(a.id,'rescue-flight',n.incidentContext);n.running=true;for(let i=0;i<2100;i++)n.advance(.1);
 const data=storage();assert.ok(saveVoyage(n,false,data));const copy=new ChannelNavigation();assert.ok(restoreVoyage(copy,false,data));
 assert.equal(copy.running,false);assert.deepEqual(copy.service.snapshot(),n.service.snapshot());assert.deepEqual(copy.incidents.snapshot(),n.incidents.snapshot());
 copy.running=true;for(let i=0;i<2101;i++)copy.advance(.1);
 assert.equal(copy.service.state.evacuated,12);assert.equal(copy.service.state.passengers,408);
 // Both snapshots are individually valid, but disagree on the number already transferred.
 const key=[...data.entries.keys()][0],bad=JSON.parse(data.getItem(key)!);bad.service.evacuated=5;bad.service.passengers=415;data.setItem(key,JSON.stringify(bad));
 const fresh=voyage(),before=[fresh.incidents.snapshot(),fresh.service.snapshot()];assert.equal(restoreVoyage(fresh,false,data),false);assert.deepEqual([fresh.incidents.snapshot(),fresh.service.snapshot()],before);
});

test('legacy saves gain safe defaults, and invalid evacuation counts are rejected atomically',()=>{
 const e=new IncidentEngine(),old=JSON.parse(JSON.stringify(e.snapshot()));delete old.effects.steering;delete old.effects.evacuated;
 assert.ok(e.restore(old));assert.equal(e.state.effects.steering,1);assert.equal(e.state.effects.evacuated,0);
 const {e:active}=evacuation();
 const corruptions:((s:IncidentState)=>void)[]=[s=>s.active[0].evacuation!.byAir=13,s=>s.active[0].evacuation!.total=NaN,s=>s.tasks.push({incident:s.active[0].id,choice:'rescue-flight',team:'navigation',elapsed:0,duration:420,evacuationStart:1}),s=>s.active[0].evacuation=undefined];
 for(const mutate of corruptions){
  const bad=active.snapshot();mutate(bad);const before=active.snapshot();assert.equal(active.restore(bad),false);assert.deepEqual(active.snapshot(),before);
 }
 const n=voyage(),data=storage();saveVoyage(n,false,data);const key=[...data.entries.keys()][0],saved=JSON.parse(data.getItem(key)!);delete saved.service.evacuated;delete saved.incidents.effects.steering;delete saved.incidents.effects.evacuated;data.setItem(key,JSON.stringify(saved));
 const copy=new ChannelNavigation();assert.ok(restoreVoyage(copy,false,data));assert.equal(copy.service.state.evacuated,0);
 assert.equal(ChannelFerryService.valid({...copy.service.snapshot(),evacuated:1}),false);
});

test('steering and cooling failures affect vessel response, and radar failure clears after intervention',()=>{
 const n=voyage();n.incidents.start('steering',n.incidentContext,true);n.incidents.start('radar',n.incidentContext,true);n.running=true;n.advance(.1);
 assert.equal(n.dynamics.steeringFactor,.45);assert.equal(n.incidents.modifiers.radarUnavailable,true);assert.ok(n.dynamics.plant.electricHealth<1);
 const healthy=new FerryDynamics(),faulty=new FerryDynamics();for(const d of [healthy,faulty]){Object.assign(d.environment,{windKnots:0,currentKnots:0,waves:0});d.restore({...d.state,surge:5},{port:0,starboard:0,rudder:.5});}faulty.steeringFactor=.45;
 for(let i=0;i<100;i++){healthy.step(.1);faulty.step(.1);}assert.ok(Math.abs(faulty.state.yawRate)<Math.abs(healthy.state.yawRate));
 const e=new IncidentEngine();e.state.frequency='off';const a=e.start('radar',context(),true)!;action(e,a,'watch');action(e,a,'restart');assert.equal(e.modifiers.radarUnavailable,false);
 const cool=new IncidentEngine();cool.state.frequency='off';const b=cool.start('cooling',context(),true)!;assert.ok(cool.modifiers.thermal<1);action(cool,b,'inspect');action(cool,b,'limited');assert.ok(cool.state.effects.thermal<1);
});

test('rescue visuals follow intervention stages and disappear after evacuation',()=>{
 const n=voyage(),view=new IncidentView(),a=n.incidents.start('evacuation',n.incidentContext,true)!;
 const fleet=view.root.getObjectByName('medical-rescue-fleet')!,flight=view.root.getObjectByName('rescue-helicopter')!,crowd=view.root.getObjectByName('assembly-passengers')!;
 view.render(n);assert.equal(fleet.visible,false);assert.equal(flight.visible,false);
 action(n.incidents,a,'alert',n.incidentContext);view.render(n);assert.equal(fleet.visible,true);assert.equal(crowd.visible,true);assert.equal(fleet.children.filter(c=>c.visible).length,3);
 for(const id of ['muster','secure'])action(n.incidents,a,id,n.incidentContext);n.incidents.assign(a.id,'rescue-flight',n.incidentContext);view.render(n);assert.equal(flight.visible,true);
 tick(n.incidents,420.1,n.incidentContext);action(n.incidents,a,'lifeboats',n.incidentContext);action(n.incidents,a,'account',n.incidentContext);view.render(n);
 assert.equal(fleet.visible,false);assert.equal(flight.visible,false);assert.equal(crowd.visible,false);view.dispose();assert.equal(view.root.parent,null);
});
