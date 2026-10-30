import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FerryService, serviceDefinition, servicePassengers, validService } from '../src/missions/FerryService.ts';
import type { Telemetry } from '../src/missions/Mission.ts';
import { Mission } from '../src/missions/Mission.ts';
import { MALO_DINARD } from '../src/missions/definitions.ts';
import { BOAT, KNOT } from '../src/ships/parameters.ts';
import { freshData, recordResult, recordServiceResult, validRun, readMarine, validServiceResult } from '../src/saves/GameStore.ts';
import { VesselDynamics } from '../src/physics/VesselDynamics.ts';
import { ShoreContact } from '../src/physics/ShoreContact.ts';
import { depthAt } from '../src/weather/Marine.ts';
import { Passengers } from '../src/passengers/Passengers.ts';
import { TourGuide, DEFAULT_COMMENTS } from '../src/excursions/comments.ts';

const sample=(pose:Partial<Telemetry>={}):Telemetry=>({...MALO_DINARD.origin.berth,speed:0,yawRate:0,port:0,starboard:0,commandPort:0,commandStarboard:0,contact:'',damage:0,clearance:5,...pose});
const advance=(service:FerryService,seconds:number,t:Telemetry,satisfaction=100)=>service.update(seconds,t,satisfaction);
function arrive(service:FerryService,satisfaction=100){
  const d=service.mission.definition;
  if(service.mission.phase==='preparation')service.mission.board();
  advance(service,d.boardingSeconds,sample(d.origin.berth));assert.equal(service.mission.phase,'departure');
  service.mission.release();advance(service,1,sample({...d.origin.berth,x:d.origin.berth.x+100}));assert.equal(service.mission.phase,'crossing');
  advance(service,1,sample(d.destination.approach));assert.equal(service.mission.phase,'approach');
  advance(service,1,sample(d.destination.berth));assert.equal(service.mission.phase,'docking');
  const atBerth=sample({...d.destination.berth,speed:1.5*KNOT});
  const before=structuredClone(atBerth);assert.ok(service.dock(atBerth));assert.deepEqual(atBerth,before);assert.equal(service.mission.phase,'unloading');
  assert.equal(advance(service,d.unloadingSeconds-.1,atBerth,satisfaction),undefined);
  return {result:advance(service,.2,atBerth,satisfaction)!,pose:atBerth};
}

test('two-way rotations run without a terminal result, and departure remains manual after boarding',()=>{
  const service=new FerryService();
  const first=arrive(service,80);assert.ok(first.result.completed);assert.equal(service.state.completed,1);assert.equal(service.state.transported,180);
  assert.equal(service.mission.phase,'boarding');assert.equal(service.originPort,'dinard');assert.equal(service.destinationPort,'malo');
  assert.deepEqual(service.mission.definition.origin.berth,MALO_DINARD.destination.berth);
  assert.equal(service.mission.definition.passengers,servicePassengers(1));assert.equal(service.mission.finished,false);assert.equal(service.result,undefined);
  advance(service,18,sample(first.pose));assert.equal(service.mission.phase,'departure');
  advance(service,3600,sample(first.pose));assert.equal(service.mission.phase,'departure');assert.equal(service.mission.moored,true);assert.equal(service.mission.state.released,false);
  service.mission.release();advance(service,1,sample({...first.pose,z:first.pose.z+100}));
  const d=service.mission.definition;advance(service,1,sample(d.destination.approach));advance(service,1,sample(d.destination.berth));assert.ok(service.dock(sample(d.destination.berth)));
  advance(service,12,sample(d.destination.berth),100);assert.equal(service.state.completed,2);assert.equal(service.destinationPort,'dinard');assert.equal(service.mission.phase,'boarding');
  assert.equal(service.state.transported,180+servicePassengers(1));assert.equal(service.result,undefined);
});

test('loads vary within capacity, leg storage stays bounded, and elapsed time has no service timeout',()=>{
  const service=new FerryService(),loads=new Set<number>();
  for(let i=0;i<150;i++){
    const n=service.mission.definition.passengers;loads.add(n);assert.ok(n>0&&n<=BOAT.passengers);
    arrive(service);assert.ok(service.mission.state.visited.length<=MALO_DINARD.route.length);assert.ok(validService(service.state));
  }
  assert.ok(loads.size>10);assert.equal(service.state.completed,150);assert.equal(service.result,undefined);
  advance(service,30,sample(service.mission.definition.origin.berth));
  advance(service,100000,sample({...service.mission.definition.origin.berth,damage:.99,clearance:-1}));
  assert.equal(service.mission.phase,'departure');assert.equal(service.result,undefined);
});

test('global history counts completed legs once and the service summary adds only remaining time',()=>{
  const data=freshData(),service=new FerryService();
  const first=arrive(service,70);assert.ok(recordResult(data,first.result));assert.equal(recordResult(data,first.result),false);
  const second=arrive(service,95);assert.ok(recordResult(data,second.result));
  advance(service,5,sample(service.mission.definition.origin.berth));
  const result=service.finish();assert.equal(result.completed,2);assert.equal(result.transported,servicePassengers(0)+servicePassengers(1));
  assert.ok(Math.abs(result.satisfaction!-(70*180+95*servicePassengers(1))/result.transported)<1e-8);
  assert.ok(result.dockingQuality!>70&&result.dockingQuality!<=100);
  assert.ok(recordServiceResult(data,result));assert.equal(recordServiceResult(data,result),false);assert.equal(service.finish(),result);
  assert.equal(data.stats.completed,2);assert.equal(data.stats.failed,0);assert.equal(data.stats.passengers,result.transported);
  assert.ok(Math.abs(data.stats.seconds-result.elapsed)<1e-6);assert.equal(data.services.length,1);assert.ok(validServiceResult(result));
  assert.equal(service.mission.finished,true);assert.equal(service.update(1,sample(),100),undefined);
});

test('stopping before a completed landing reports honest zeroes and no average satisfaction',()=>{
  const service=new FerryService();service.mission.board();advance(service,3,sample());
  const result=service.finish();assert.equal(result.completed,0);assert.equal(result.transported,0);assert.equal(result.satisfaction,null);assert.equal(result.dockingQuality,null);assert.equal(result.elapsed,3);
});

test('return-leg save/reload preserves destination, loading, elapsed time and statistics',()=>{
  const service=new FerryService();arrive(service,85);advance(service,7,sample(service.mission.definition.origin.berth),95);
  const ship=new VesselDynamics(service.mission.definition.origin.berth),state=structuredClone(service.state),leg=structuredClone(service.mission.state);
  const save={missionId:'malo-dinard',mission:leg,vessel:ship.state,command:ship.command,marine:readMarine({}),damage:0,service:state};assert.ok(validRun(save));
  const restored=new FerryService(state,leg);assert.equal(restored.destinationPort,'malo');assert.equal(restored.mission.phase,'boarding');assert.equal(restored.mission.state.phaseTime,7);assert.deepEqual(restored.state,state);
  advance(service,1,sample(ship.state),95);advance(restored,1,sample(ship.state),95);assert.deepEqual(restored.state,service.state);assert.deepEqual(restored.mission.state,service.mission.state);
  restored.state.transported++;assert.notEqual(restored.state.transported,state.transported);
  const invalid=[{completed:-1},{completed:1.5},{transported:9999},{elapsed:NaN},{satisfactionTotal:Infinity},{currentDockQuality:120},{accountedSeconds:1e20},{approachContacts:10}];
  for(const bad of invalid)assert.equal(validRun({...save,service:{...state,...bad}}),false);
});

test('old one-way saves migrate into a service without resetting the ongoing crossing',()=>{
  const leg=new Mission(MALO_DINARD);leg.state.phase='crossing';leg.state.released=true;leg.state.elapsed=230;leg.state.visited=[0];
  const service=new FerryService(undefined,leg.state);assert.equal(service.mission.phase,'crossing');assert.equal(service.state.elapsed,230);assert.equal(service.destinationPort,'dinard');assert.deepEqual(service.mission.state.visited,[0]);
});

test('return route and recovery poses stay in open water and do not alter standard mission limits',()=>{
  for(const d of [serviceDefinition(0),serviceDefinition(1)])for(const pose of [d.origin.berth,d.destination.berth,d.destination.approach]){
    const ship=new VesselDynamics(pose),contact=new ShoreContact();contact.evaluate(ship.state);assert.equal(contact.label,'');assert.ok(depthAt(pose.x,pose.z,-2.4)>BOAT.draft+1);
  }
  const standard=new Mission({...MALO_DINARD,id:'other-mission'});standard.board();standard.state.elapsed=1201;standard.update(1,sample());assert.equal(standard.phase,'failed');
});

test('passenger transfers respect capacity and zero-time synchronization does not spoil satisfaction',()=>{
  const p=new Passengers();p.update(1/60,'boarding',9,227,18,12,0,0,.3);assert.equal(p.count,113);
  p.update(0,'boarding',9,227,18,12,0,0,.3);assert.equal(p.satisfaction,100);
  p.update(1/60,'departure',0,500,18,12,0,0,.3);assert.equal(p.count,270);
  p.update(1/60,'unloading',6,227,18,12,0,0,.3);assert.equal(p.count,114);
  p.update(1/60,'boarding',0,153,18,12,0,0,.3);assert.equal(p.count,0);
});

test('tourism follows each direction while user-edited commentary is preserved',()=>{
  const guide=new TourGuide();guide.destination='malo';
  assert.match(guide.choose('moulinet')!.text,/En quittant Dinard/);assert.match(guide.choose('remparts')!.text,/approchons de Saint-Malo/);
  assert.match(guide.choose('clair-lune')!.text,/direction de Saint-Malo/);
  guide.comments[0]={...DEFAULT_COMMENTS[0],text:'Mon annonce personnelle.'};assert.equal(guide.choose('remparts')!.text,'Mon annonce personnelle.');
  guide.reset();guide.destination='dinard';assert.match(guide.choose('moulinet')!.text,/À l’approche de Dinard/);
});
