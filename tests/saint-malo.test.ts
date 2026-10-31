import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOAT, KNOT, SAINT_MALO } from '../src/ships/parameters.ts';
import { VesselDynamics } from '../src/physics/VesselDynamics.ts';
import { ShoreContact } from '../src/physics/ShoreContact.ts';
import { Marine } from '../src/weather/Marine.ts';
import { Passengers } from '../src/passengers/Passengers.ts';
import { FerryService, serviceDefinition, validService } from '../src/missions/FerryService.ts';
import { MISSIONS } from '../src/missions/definitions.ts';
import { vesselMission } from '../src/missions/vesselMission.ts';

test('Saint-Malo reaches 19.5 knots gradually and remains capped under following external force',()=>{
  const v=new VesselDynamics({x:0,z:-1000,heading:0});v.parameters=SAINT_MALO;v.setCommand({port:1,starboard:1});
  v.step(1/60);assert.ok(v.state.surge>0&&v.state.surge<.01);
  for(let i=0;i<180*60;i++)v.step(1/60);
  assert.ok(v.state.surge/KNOT>19.4&&v.state.surge/KNOT<=19.5);
  for(let i=0;i<10*60;i++){v.step(1/60,{x:40000,z:-60000,yaw:0});assert.ok(Math.hypot(v.state.surge,v.state.sway)/KNOT<=19.5+1e-9);}
  v.setCommand({port:0,starboard:0});const speed=v.state.surge;v.step(1/60);assert.ok(v.state.surge>speed*.98);
  assert.equal(new VesselDynamics().parameters,BOAT);assert.equal(BOAT.maxSpeedKnots,19.5);
});

test('catamaran resists lateral drift and retains differential engines and astern steering',()=>{
  const simulate=(p:typeof SAINT_MALO)=>{const v=new VesselDynamics();v.parameters=p;v.state.sway=1;for(let i=0;i<60;i++)v.step(1/60);return v.state.sway;};
  assert.ok(simulate(SAINT_MALO)<simulate(BOAT));
  for(const side of [-1,1]){const v=new VesselDynamics();v.parameters=SAINT_MALO;v.setCommand({port:side,starboard:-side});for(let i=0;i<1200;i++)v.step(1/60);assert.ok(v.state.yawRate*side>.01);}
  const v=new VesselDynamics();v.parameters=SAINT_MALO;v.setCommand({port:-1,starboard:-1,rudder:1});for(let i=0;i<3600;i++)v.step(1/60);assert.ok(v.state.surge<0&&v.state.yawRate<0);
});

test('contacts and under-keel clearance use the selected hull dimensions',()=>{
  const v=new VesselDynamics(),c=new ShoreContact();c.parameters=SAINT_MALO;
  assert.deepEqual({...c.evaluate(v.state)},{x:0,z:0,yaw:0});
  v.reset({x:-947,z:1120,heading:-Math.PI/2});v.state.surge=3;assert.ok(c.evaluate(v.state).x>0);assert.ok(c.impactSpeed>2.99);
  const a=new Marine(),b=new Marine();b.parameters=SAINT_MALO;v.reset({x:3000,z:-3000,heading:0});a.hazards(v.state,'',0,0);b.hazards(v.state,'',0,0);
  assert.ok(b.clearance-a.clearance>.2);
});

test('all missions and subsequent service legs respect 245 passengers and the faster ship profile',()=>{
  for(const authored of MISSIONS){const d=vesselMission(authored,SAINT_MALO);assert.ok(d.passengers<=245&&d.cruiseKnots<=19.5);assert.ok(d.targetSeconds>=authored.targetSeconds);assert.equal(d.route,authored.route);}
  for(let leg=0;leg<20;leg++){const d=serviceDefinition(leg,SAINT_MALO);assert.ok(d.passengers<=245);assert.equal(d.cruiseKnots,17);assert.match(d.comments.crossing,/17 nd/);}
  const service=new FerryService(undefined,undefined,SAINT_MALO);const resumed=new FerryService(service.state,service.mission.state,SAINT_MALO);assert.deepEqual(resumed.mission.definition,service.mission.definition);
  assert.equal(service.crossingSeconds,360);assert.equal(resumed.crossingSeconds,360);assert.ok(validService(service.state));assert.equal(new FerryService().crossingSeconds,360);
  const p=new Passengers();p.capacity=245;p.update(0,'departure',0,500,18,12,0,0,0);assert.equal(p.count,245);
});
