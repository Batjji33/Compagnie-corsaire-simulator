import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Mission, dockingStatus } from '../src/missions/Mission.ts';
import type { Telemetry } from '../src/missions/Mission.ts';
import { MALO_DINARD } from '../src/missions/definitions.ts';
import { KNOT } from '../src/ships/parameters.ts';
import { ShoreContact } from '../src/physics/ShoreContact.ts';
import { VesselDynamics } from '../src/physics/VesselDynamics.ts';
import { depthAt } from '../src/weather/Marine.ts';
import { freshData, recordResult, validRun, readMarine } from '../src/saves/GameStore.ts';

const sample=(overrides:Partial<Telemetry>={}):Telemetry=>({
  ...MALO_DINARD.origin.berth,speed:0,yawRate:0,port:0,starboard:0,commandPort:0,commandStarboard:0,contact:'',damage:0,clearance:5,...overrides,
});
const tick=(m:Mission,seconds:number,t:Telemetry)=>{for(let i=0;i<Math.round(seconds*60);i++)m.update(1/60,t);};
const departed=()=>{const m=new Mission(MALO_DINARD);m.board();tick(m,18.1,sample());m.release();tick(m,1,sample({x:700,z:440}));return m;};
const atDock=()=>{const m=departed();tick(m,1,sample({x:-750,z:1100}));tick(m,1,sample({...MALO_DINARD.destination.berth}));return m;};

test('boarding is timed, moorings require explicit release, and departure cannot be skipped',()=>{
  const m=new Mission(MALO_DINARD);tick(m,5,sample());assert.equal(m.phase,'preparation');assert.equal(m.state.elapsed,0);
  m.board();tick(m,17,sample());assert.equal(m.phase,'boarding');assert.ok(m.moored);
  tick(m,1.1,sample());assert.equal(m.phase,'departure');assert.ok(m.moored);
  tick(m,1,sample({x:-945,z:1120}));assert.equal(m.phase,'departure');
  m.release();assert.equal(m.moored,false);tick(m,1,sample({x:700,z:440}));assert.equal(m.phase,'crossing');
});
test('waypoints are suggestions; the arrival approach and docking stages still apply',()=>{
  const m=departed();m.state.visited=[];tick(m,1,sample({x:-750,z:1100}));assert.equal(m.phase,'approach');
  assert.equal(m.state.checkpoint,'approach');tick(m,1,sample({...MALO_DINARD.destination.berth}));assert.equal(m.phase,'docking');
});
test('docking rejects distance, heading, speed, live engines, turning and contact',()=>{
  const d=MALO_DINARD,t=sample({...d.destination.berth});assert.ok(dockingStatus(d,t).valid);
  for(const bad of [{x:-900},{heading:Math.PI/2},{speed:KNOT},{port:.3},{commandPort:.1},{yawRate:.04},{contact:'Quai'},{clearance:0}])assert.equal(dockingStatus(d,{...t,...bad}).valid,false);
  assert.ok(dockingStatus(d,{...t,heading:Math.PI}).valid);
  const m=atDock();assert.equal(m.dock(t),false);tick(m,3,t);assert.equal(m.dock(t),false);
  tick(m,.1,{...t,speed:2});assert.equal(m.state.hold,0);tick(m,4.1,t);assert.ok(m.dock(t));assert.equal(m.phase,'unloading');assert.ok(m.moored);
});
test('arrival is only completed after unloading; scores and local records are consistent',()=>{
  const m=atDock(),t=sample({...MALO_DINARD.destination.berth});tick(m,4.1,t);m.dock(t);tick(m,11,t);assert.equal(m.result,undefined);
  tick(m,1.1,t);assert.equal(m.phase,'complete');assert.equal(m.result!.passengers,180);assert.equal(m.result!.score,100);
  const data=freshData();assert.ok(recordResult(data,m.result!));assert.equal(recordResult(data,m.result!),false);
  assert.equal(data.stats.completed,1);assert.equal(data.stats.passengers,180);assert.equal(data.stats.best,m.result!.score);
});
test('safety, comfort, manoeuvres and lateness affect the actual score',()=>{
  const m=departed();tick(m,4,sample({x:700,z:440,speed:12,contact:'Quai',damage:.2,yawRate:.3}));
  m.state.elapsed=480;m.state.metrics.recoveries=1;
  const result=m.makeResult(true,'test');assert.ok(result.safety<100);assert.ok(result.comfort<100);assert.equal(result.punctuality,60);assert.ok(result.manoeuvres<100);assert.ok(result.score<80);
});
test('damage, prolonged grounding, leaving the bay and time limit cause explicit failures',()=>{
  for(const [t,seconds,reason] of [[sample({damage:.9}),1,/Coque/],[sample({clearance:-1}),16,/Échouement/],[sample({x:6000}),1,/zone de jeu/]] as const){
    const m=departed();tick(m,seconds,t);assert.equal(m.phase,'failed');assert.match(m.failure,reason);assert.equal(m.result!.score,0);
  }
  const late=departed();late.state.elapsed=1200;tick(late,1,sample());assert.match(late.failure,/Temps maximal/);
});
test('recovery retains score penalties and elapsed time, clears failure, and restores a sensible phase',()=>{
  const m=atDock();m.fail('incident');const elapsed=m.state.elapsed,oldId=m.state.runId;m.recover();
  assert.equal(m.phase,'approach');assert.equal(m.state.elapsed,elapsed);assert.equal(m.state.metrics.recoveries,1);assert.notEqual(m.state.runId,oldId);assert.equal(m.result,undefined);
});
test('mission snapshot resumes objectives and holding progress without sharing mutable metrics',()=>{
  const m=atDock(),saved=structuredClone(m.state),restored=new Mission(MALO_DINARD,saved);
  assert.deepEqual(restored.state,m.state);restored.state.metrics.contacts++;assert.notEqual(restored.state.metrics.contacts,saved.metrics.contacts);
  const vessel=new VesselDynamics();vessel.setCommand({port:.4});for(let i=0;i<600;i++)vessel.step(1/60);
  const other=new VesselDynamics();other.restore(vessel.state,vessel.command);vessel.step(1/60);other.step(1/60);assert.deepEqual(other.state,vessel.state);
  other.reset();assert.equal(other.state.surge,0);assert.equal(other.state.port,0);assert.equal(other.command.port,0);
});
test('resumed speed does not cause false discomfort and recovered time is counted once',()=>{
  const m=departed(),restored=new Mission(MALO_DINARD,m.state);
  restored.update(1/60,sample({x:700,z:440,speed:8}));assert.equal(restored.state.metrics.discomfort,0);
  const data=freshData();m.fail('Incident');recordResult(data,m.result!);const first=m.state.elapsed;
  m.recover();tick(m,10,sample({x:700,z:440}));recordResult(data,m.makeResult(true,'Arrivée'));
  assert.ok(Math.abs(data.stats.seconds-first-10)<.01);
});
test('berths and recovery points match collision geometry and have adequate depth',()=>{
  for(const pose of [MALO_DINARD.origin.berth,MALO_DINARD.destination.berth,MALO_DINARD.destination.approach]){
    const boat=new VesselDynamics(pose),contact=new ShoreContact();contact.evaluate(boat.state);assert.equal(contact.label,'');assert.ok(depthAt(pose.x,pose.z,-2.4)>2.9);
  }
});
test('normal travel timing remains around 5–6 minutes without altering the physics clock',()=>{
  const d=MALO_DINARD;
  const route=[d.origin.berth,...d.route,d.destination.berth];
  const distance=route.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-route[i].x,p.z-route[i].z),0);
  // 17-knot cruise plus 85 seconds for acceleration, low-speed departure/approach and mooring.
  const duration=distance/(d.cruiseKnots*KNOT)+d.boardingSeconds+d.unloadingSeconds+85;
  assert.ok(duration>=300&&duration<=360,`nominal passage ${duration.toFixed(1)} seconds`);
});
test('stored preferences and active runs validate malformed browser data',()=>{
  assert.equal(readMarine({sea:'bad',hour:Infinity,sound:'yes'}).sea,'belle');assert.equal(readMarine({hour:Infinity}).hour,14);assert.equal(validRun({}),false);
  const m=departed(),v=new VesselDynamics();const run={missionId:'malo-dinard',mission:m.state,vessel:v.state,command:v.command,marine:readMarine({}),damage:0};
  assert.ok(validRun(run));assert.equal(validRun({...run,vessel:{...v.state,x:NaN}}),false);
});
