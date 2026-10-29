import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Marine, depthAt, instruments } from '../src/weather/Marine.ts';
import { VesselDynamics } from '../src/physics/VesselDynamics.ts';
import { ShoreContact } from '../src/physics/ShoreContact.ts';
import { BOAT, KNOT } from '../src/ships/parameters.ts';
const advance=(m:Marine,seconds:number)=>{for(let i=0;i<seconds*60;i++)m.update(1/60);};
test('sea changes progressively and converges to the selected local preset',()=>{
  const m=new Marine();m.evolving=false;m.sea='agitee';m.update(1/60);
  assert.ok(m.waves>.6&&m.waves<.61);advance(m,180);
  assert.ok(Math.abs(m.waves-2.2)<.001);assert.ok(Math.abs(m.wind-24)<.01);
  m.sea='calme';advance(m,180);assert.ok(Math.abs(m.waves-.15)<.001);
});
test('wind crosses north by the shortest path and weather evolution remains bounded',()=>{
  const m=new Marine();m.evolving=false;m.direction=359;m.targetDirection=1;advance(m,1);
  assert.ok(m.direction>359);advance(m,180);assert.ok(m.direction<1.01);
  m.evolving=true;advance(m,1000);assert.ok(m.visibility>0&&m.wind>0&&m.waves>0);
});
test('tide changes soundings, daylight cycles and clocks can be held',()=>{
  const m=new Marine();advance(m,180);assert.ok(Math.abs(m.tide-2.4)<.001);
  assert.ok(Math.abs(depthAt(0,0,m.tide)-depthAt(0,0)-2.4)<.001);
  m.hour=0;const night=m.daylight;m.hour=12;assert.ok(m.daylight>night*10);
  m.dayCycle=false;m.tideCycle=false;const hour=m.hour,phase=m.tidePhase;advance(m,60);
  assert.equal(m.hour,hour);assert.equal(m.tidePhase,phase);
});
test('instruments read vector ground speed and wrap heading at north',()=>{
  const boat=new VesselDynamics();boat.state.heading=-Math.PI/2;boat.state.surge=3*KNOT;boat.state.sway=4*KNOT;
  assert.equal(instruments(boat.state).speed,5);assert.equal(instruments(boat.state).heading,270);
  boat.state.heading=2*Math.PI-.00001;assert.equal(instruments(boat.state).heading,0);
});
test('wind, waves and tidal current change drift at neutral',()=>{
  const calm=new VesselDynamics(),rough=new VesselDynamics(),m=new Marine();m.sea='agitee';advance(m,180);
  for(let i=0;i<1200;i++){m.update(1/60);rough.step(1/60,m.forces(rough.state));calm.step(1/60);}
  assert.ok(Math.hypot(rough.state.x-calm.state.x,rough.state.z-calm.state.z)>2);
  assert.ok(Object.values(rough.state).every(Number.isFinite));
});
test('shoal grounding warns and damage toggle preserves collision physics',()=>{
  const m=new Marine(),boat=new VesselDynamics({x:-150,z:150,heading:0});boat.state.surge=3;
  assert.ok(m.hazards(boat.state,'',0,1));assert.equal(m.warning,'Échouement');assert.ok(m.damage>0);
  m.damageEnabled=false;const damage=m.damage;m.hazards(boat.state,'Rochers',5,1);
  assert.equal(m.damage,damage);assert.equal(m.performance,1);assert.match(m.warning,/Rochers/);
  m.damageEnabled=true;assert.ok(m.performance<1);
  assert.ok(depthAt(BOAT.spawn.x,BOAT.spawn.z,-2.4)>BOAT.draft+1);
});
test('quay impact is measured along the contact normal and severe damage reduces speed',()=>{
  const contact=new ShoreContact(),boat=new VesselDynamics({x:920,z:258,heading:0});boat.state.surge=4;
  contact.evaluate(boat.state);assert.ok(contact.impactSpeed>=4);
  const m=new Marine();m.hazards(boat.state,contact.label,contact.impactSpeed,1/60);assert.ok(m.damage>.1);
  const damaged=new VesselDynamics(),intact=new VesselDynamics();damaged.powerFactor=.3;
  for(const b of [damaged,intact]){b.setCommand({port:1,starboard:1});for(let i=0;i<10800;i++)b.step(1/60);}
  assert.ok(damaged.state.surge<intact.state.surge*.7);
});
