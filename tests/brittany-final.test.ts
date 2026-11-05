import assert from 'node:assert/strict';
import test from 'node:test';
import {ChannelNavigation} from '../src/core/ChannelNavigation.ts';
import {ChannelFerryService} from '../src/missions/ChannelFerryService.ts';
import {CHANNEL_BERTHS,CHANNEL_LENGTH,routePose,routeProgress,ferryContact} from '../src/world/ChannelGeography.ts';
import {saveVoyage,restoreVoyage} from '../src/saves/ChannelVoyageSave.ts';
import {ChannelQuality} from '../src/core/ChannelQuality.ts';
import {WakeTrail} from '../src/ships/WakeTrail.ts';
import {FERRY_PARAMETERS} from '../src/physics/FerryDynamics.ts';
import {INCIDENT_DEFINITIONS} from '../src/incidents/definitions.ts';

function start(north=false){const n=new ChannelNavigation();n.initializeVoyage(north);n.incidents.state.frequency='off';Object.assign(n.dynamics.environment,{currentKnots:0,windKnots:0,waves:.1});return n;}
function tick(n:ChannelNavigation,seconds:number){n.running=true;for(let i=0;i<Math.round(seconds*10);i++){n.advance(.1);assert.equal(n.collision,'');}}
function loaded(n:ChannelNavigation){assert.ok(n.service.board());tick(n,385);assert.equal(n.service.state.phase,'ready');assert.equal(n.service.state.ramp,0);assert.equal(n.service.state.passengers,420);assert.equal(n.service.state.vehicles,80);}
const storage=()=>{const entries=new Map<string,string>();return {entries,getItem:(k:string)=>entries.get(k)??null,setItem:(k:string,v:string)=>{entries.set(k,v);},removeItem:(k:string)=>{entries.delete(k);}};};

test('both ferry services board, interlock, depart, unload and prepare return without resetting the vessel',()=>{
 for(const north of [false,true]){
  const n=start(north),origin=CHANNEL_BERTHS[north?1:0];assert.equal(n.state.x,origin.point[0]);assert.equal(n.state.heading,origin.heading);const before={...n.state};
  assert.equal(n.service.depart(),false);assert.ok(n.toggleCharge());loaded(n);assert.deepEqual(n.state,before);assert.equal(n.service.depart(false,n.dynamics.plant.shore),false);n.toggleCharge();assert.ok(n.service.depart());
  assert.equal(n.service.unload(),false);assert.equal(n.moor(),false);
  // Destination fixture: evaluates arrival operations, not a claim of an eight-hour manual voyage.
  const b=n.destination;n.dynamics.reset({x:b.point[0]+2,z:b.point[1],heading:b.heading});n.dynamics.groundSpeed=0;
  assert.ok(n.canMoor);const position=[n.state.x,n.state.z];assert.ok(n.moor());assert.deepEqual([n.state.x,n.state.z],position);assert.ok(n.service.unload());tick(n,310);
  assert.equal(n.service.state.phase,'complete');assert.equal(n.service.state.passengers,0);assert.equal(n.service.state.vehicles,0);assert.equal(n.service.state.ramp,0);
  n.incidents.state.effects.delay=37;n.incidents.state.effects.thermal=.7;const energy=[n.dynamics.plant.fuelKg,n.dynamics.plant.batteryKWh],time=n.simTime,hour=n.hour;
  assert.ok(n.prepareReturn());assert.equal(n.service.state.origin,north?0:1);assert.deepEqual([n.state.x,n.state.z],position);assert.deepEqual([n.dynamics.plant.fuelKg,n.dynamics.plant.batteryKWh],energy);assert.equal(n.simTime,time);assert.equal(n.hour,hour);assert.equal(n.incidents.modifiers.thermal,.7);assert.equal(n.incidents.state.effects.delay,37);
 }
});

test('mooring rejects the wrong heading, drift, occupied berth, throttle and a disrupted terminal',()=>{
 const n=start();loaded(n);n.service.depart();const b=n.destination;n.dynamics.reset({x:b.point[0],z:b.point[1],heading:b.heading});assert.ok(n.canMoor);
 n.state.heading+=.3;assert.equal(n.moor(),false);n.state.heading=b.heading;
 n.dynamics.groundSpeed=.25;assert.equal(n.moor(),false);n.dynamics.groundSpeed=0;
 n.dynamics.setCommand({port:.3});assert.equal(n.moor(),false);n.dynamics.setCommand({port:0});
 n.traffic.berths.ports.dinard.owner='other';assert.equal(n.moor(),false);n.traffic.berths.ports.dinard.owner=null;
 const incident=n.incidents.start('port',n.incidentContext,true)!;assert.ok(incident);assert.equal(n.moor(),false);assert.equal(n.toggleCharge(),false);
});

test('ramp and manifest progress stop on pause or port disruption and resume at each time rate',()=>{
 const snapshots=[];for(const rate of [1,2,4,8]){const n=start();n.service.board();n.requestedRate=rate;n.running=true;for(let i=0;i<800/rate;i++)n.advance(.1);n.running=false;const before=n.service.snapshot();n.advance(.1);assert.deepEqual(n.service.snapshot(),before);snapshots.push(before);}for(const s of snapshots.slice(1))assert.deepEqual(s,snapshots[0]);
 const s=new ChannelFerryService();s.initialize(0);s.board();for(let i=0;i<800;i++)s.step(.1,false,0,0,0);const before=s.snapshot();for(let i=0;i<300;i++)s.step(.1,true,0,0,0);assert.deepEqual(s.snapshot(),before);assert.ok(s.state.passengers>0&&s.state.passengers<420);assert.equal(s.depart(),false);
});

test('save restores mid-boarding service, clock, passenger comfort and manual arrival telemetry',()=>{
 const n=start(true);n.hour=23.5;n.dayCycle=false;n.service.board();tick(n,100);n.service.passengers.discomfort=12;n.service.passengers.satisfaction=78.4;
 const data=storage();assert.ok(saveVoyage(n,true,data));const copy=new ChannelNavigation();assert.ok(restoreVoyage(copy,true,data));assert.equal(copy.guided,false);assert.equal(copy.running,false);assert.deepEqual(copy.service.snapshot(),n.service.snapshot());assert.equal(copy.hour,23.5);assert.equal(copy.dayCycle,false);assert.equal(copy.simTime,n.simTime);assert.equal(copy.dynamics.groundSpeed,0);assert.equal(copy.service.passengers.discomfort,12);
 const json=JSON.parse([...data.entries.values()][0]);json.service.ramp=4;data.setItem([...data.entries.keys()][0],JSON.stringify(json));const fresh=start(),before=fresh.service.snapshot();assert.equal(restoreVoyage(fresh,true,data),false);assert.deepEqual(fresh.service.snapshot(),before);
});

test('pre-service saves remain free pilot sessions without mooring the ferry at sea',()=>{
 const n=start(),data=storage();saveVoyage(n,false,data);const key=[...data.entries.keys()][0],s=JSON.parse(data.getItem(key)!);delete s.service;s.pose.x=15000;s.pose.z=-80000;s.pose.surge=6;data.setItem(key,JSON.stringify(s));const copy=start();assert.ok(restoreVoyage(copy,false,data));assert.equal(copy.service.immobilized,false);assert.equal(copy.service.state.enabled,false);assert.ok(copy.dynamics.groundSpeed>5);
});

test('progress is continuous in both directions and the full ferry footprint clears the return route',()=>{
 for(let distance=0;distance<=CHANNEL_LENGTH;distance+=40){const p=routePose(distance);assert.ok(Math.abs(routeProgress(p.x,p.z)-distance)<.001);assert.equal(ferryContact(p.x,p.z,p.heading+Math.PI),undefined);}
 for(const north of [false,true]){const n=start(north);loaded(n);n.service.depart();Object.assign(n.state,routePose(CHANNEL_LENGTH*.4));n.advance(.1);assert.ok(Math.abs(n.distance-CHANNEL_LENGTH*.4)<2);assert.ok(Math.abs(n.remaining-CHANNEL_LENGTH*(north?.4:.6))<2);}
});

test('a moored ferry holds position in wind and current while the battery charges',()=>{
 const n=start();Object.assign(n.dynamics.environment,{currentKnots:1,windKnots:25});const s={...n.state},battery=n.dynamics.plant.batteryKWh;assert.ok(n.canCharge);n.toggleCharge();tick(n,60);assert.deepEqual(n.state,s);assert.ok(n.dynamics.plant.batteryKWh>battery);assert.equal(n.dynamics.groundSpeed,0);assert.equal(n.wake.count,0);
});

test('wake anchors to the 194.7m stern at all headings and graphical quality adapts conservatively',()=>{
 const n=start(),w=new WakeTrail();w.parameters=FERRY_PARAMETERS;
 for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2]){w.clear();w.update(.2,1,{...n.state,heading,surge:8});const a=w.at(0);assert.ok(Math.abs(Math.hypot(a.x-n.state.x,a.z-n.state.z)-194.7*.48)<1e-8);assert.ok(Math.abs(a.z-n.state.z-Math.cos(heading)*194.7*.48)<1e-8);}
 const q=new ChannelQuality(8);assert.equal(q.quality,'medium');for(let t=1;t<20000;t+=100)q.observe(t);assert.equal(q.quality,'low');assert.ok(q.fps<11);q.choose('high');for(let t=20001;t<40000;t+=100)q.observe(t);assert.equal(q.quality,'high');assert.equal(new ChannelQuality(4).quality,'low');
});

test('spontaneous passenger incidents require passengers when the service manifest is empty',()=>{
 const n=start();for(const id of ['medical','helicopter','cabin']){const d=INCIDENT_DEFINITIONS.find(d=>d.id===id)!;const c={...n.incidentContext,zone:'offshore' as const,waves:2};assert.equal(d.eligible(c,[]),false,id);assert.equal(d.eligible({...c,passengers:420},[]),true,id);}
});
