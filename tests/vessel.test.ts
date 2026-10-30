import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VesselDynamics } from '../src/physics/VesselDynamics.ts';
import { BOAT, KNOT, ENGINE_NOTCHES } from '../src/ships/parameters.ts';
import { FixedStep } from '../src/core/FixedStep.ts';
import { ShoreContact } from '../src/physics/ShoreContact.ts';
const run=(boat:VesselDynamics,seconds:number)=>{for(let i=0;i<seconds*60;i++)boat.step(1/60);};
test('commands are bounded, finite and rudder has a finite rate',()=>{
  const boat=new VesselDynamics();boat.setCommand({port:9,starboard:-12,rudder:Infinity});
  assert.deepEqual(boat.command,{port:1,starboard:-1,rudder:0});
  boat.setCommand({rudder:1});boat.step(1/60);
  assert.ok(boat.state.rudder>0&&boat.state.rudder<=BOAT.rudderRateDegrees*Math.PI/180/60+1e-9);
  assert.throws(()=>boat.step(NaN));
});
test('two engines reach the calibrated 19.5 knots without instant acceleration',()=>{
  const boat=new VesselDynamics();boat.setCommand({port:1,starboard:1});run(boat,1);
  assert.ok(boat.state.surge>0&&boat.state.surge<.5);run(boat,180);
  assert.ok(Math.abs(boat.state.surge/KNOT-19.5)<.15);
  assert.equal(boat.state.yawRate,0);assert.equal(boat.state.sway,0);
});
test('neutral coasts, astern takes time to reverse and reverse speed is limited',()=>{
  const boat=new VesselDynamics();boat.setCommand({port:1,starboard:1});run(boat,90);
  const speed=boat.state.surge;boat.setCommand({port:0,starboard:0});run(boat,1);
  assert.ok(boat.state.surge>speed*.8);run(boat,60);assert.ok(boat.state.surge<speed*.5);
  boat.setCommand({port:-1,starboard:-1});run(boat,180);
  assert.ok(boat.state.surge<0&&Math.abs(boat.state.surge+BOAT.reverseMaxSpeed)<.03);
});
test('differential thrust yaws at low speed, rudder alone does not',()=>{
  const idle=new VesselDynamics();idle.setCommand({rudder:1});run(idle,20);assert.equal(idle.state.yawRate,0);
  const boat=new VesselDynamics();boat.setCommand({port:.5,starboard:-.5});run(boat,20);assert.ok(boat.state.yawRate>.003);
  const reverse=new VesselDynamics();reverse.setCommand({port:-.5,starboard:.5});run(reverse,20);assert.ok(reverse.state.yawRate<-.003);
});
test('rudder develops gradual yaw with forward speed and retains yaw inertia',()=>{
  const boat=new VesselDynamics();boat.setCommand({port:.7,starboard:.7});run(boat,60);boat.setCommand({rudder:.6});run(boat,15);
  assert.ok(boat.state.yawRate>.01);const rate=boat.state.yawRate;
  boat.setCommand({rudder:0});boat.step(1/60);assert.ok(boat.state.yawRate>rate*.9);
});
test('same fixed-step manoeuvre at 30 and 144 rendering FPS',()=>{
  const simulate=(fps:number)=>{const boat=new VesselDynamics(),clock=new FixedStep(1/60,.15,8);boat.setCommand({port:.6,starboard:.5,rudder:.3});for(let i=0;i<fps*30;i++)clock.advance(1/fps,dt=>boat.step(dt));return boat.state;};
  assert.deepEqual(simulate(30),simulate(144));
});
test('spawn is clear of the quay; low-speed contact opposes approach',()=>{
  const boat=new VesselDynamics(),contact=new ShoreContact();
  assert.deepEqual({...contact.evaluate(boat.state)},{x:0,z:0,yaw:0});
  boat.state.x=920;boat.state.z=258;boat.state.heading=0;boat.state.surge=1;
  const force=contact.evaluate(boat.state);assert.ok(force.z>0);assert.match(contact.label,/Dinan/);
  for(let i=0;i<600;i++)boat.step(1/60,contact.evaluate(boat.state));
  assert.ok(boat.state.z>255);assert.ok(Object.values(boat.state).every(Number.isFinite));
});
test('engine reversal includes a neutral dwell and cannot swap thrust in one step',()=>{
  const boat=new VesselDynamics();boat.setCommand({port:1,starboard:1});run(boat,20);
  boat.setCommand({port:-1});boat.step(1/60);assert.ok(boat.state.port>.9);
  let neutralSteps=0;
  for(let i=0;i<20*60;i++){boat.step(1/60);if(boat.state.port===0)neutralSteps++;}
  assert.ok(neutralSteps>=20&&neutralSteps<=22);assert.ok(boat.state.port<-.9);assert.ok(boat.state.starboard>.99);
});

test('every engine command uses seven exact notches while actual thrust stays continuous',()=>{
  const boat=new VesselDynamics();
  for(const value of ENGINE_NOTCHES){boat.setCommand({port:value});assert.equal(boat.command.port,value);assert.equal(boat.command.starboard,0);}
  boat.setCommand({port:.47,starboard:-.85});assert.deepEqual(boat.command,{port:.3,starboard:-1,rudder:0});
  boat.reset();boat.setCommand({port:1,starboard:-1});boat.step(1/60);
  assert.ok(boat.state.port>0&&boat.state.port<.02);assert.ok(boat.state.starboard<0&&boat.state.starboard>-.02);
  const saved={...boat.state,port:.42,starboard:-.52};boat.restore(saved,{port:.42,starboard:-.52,rudder:.4});
  assert.equal(boat.command.port,.3);assert.equal(boat.command.starboard,-.65);assert.equal(boat.state.port,.42);
  boat.setCommand({port:NaN,starboard:Infinity});assert.equal(boat.command.port,0);assert.equal(boat.command.starboard,0);
});

test('acceleration and neutral slowdown take at most half the previous calibrated times',()=>{
  const boat=new VesselDynamics();boat.setCommand({port:1,starboard:1});run(boat,19.6);
  // Before: 39.20 s to 90% of 19.5 kn; 24.58 s from cruise to half speed at neutral.
  assert.ok(boat.state.surge>=BOAT.maxSpeedKnots*KNOT*.9);
  run(boat,180);boat.setCommand({port:0,starboard:0});run(boat,12.29);
  assert.ok(boat.state.surge<=BOAT.maxSpeedKnots*KNOT*.5);
});

test('ahead to astern and braking remain smooth but take less than half the previous time',()=>{
  const boat=new VesselDynamics();boat.setCommand({port:1,starboard:1});run(boat,30);boat.setCommand({port:-1,starboard:-1});run(boat,5.1);
  // Before: 10.22 s to -30% thrust; 16.17 s to stop from 3 m/s with astern ordered.
  assert.ok(boat.state.port<-.3&&boat.state.starboard<-.3);
  boat.reset();boat.state.surge=3;boat.setCommand({port:-1,starboard:-1});run(boat,8);
  assert.ok(boat.state.surge<0);
});

test('opposed engines pivot strongly in either direction without an instant angular jump',()=>{
  const clockwise=new VesselDynamics({x:0,z:0,heading:0}),counter=new VesselDynamics({x:0,z:0,heading:0});
  clockwise.setCommand({port:1,starboard:-1});clockwise.step(1/60);assert.ok(clockwise.state.yawRate<.001);
  run(clockwise,20-1/60);counter.setCommand({port:-1,starboard:1});run(counter,20);
  // Before: 25.51 degrees in 20 s. More than double the turn, with a finite yaw rate.
  assert.ok(clockwise.state.heading>Math.PI/3&&clockwise.state.yawRate<.1);
  assert.ok(Math.abs(clockwise.state.heading+counter.state.heading)<1e-9);
  const balanced=new VesselDynamics({x:0,z:0,heading:0});balanced.setCommand({port:.65,starboard:-1});run(balanced,20);
  assert.ok(balanced.state.heading>.8&&Math.abs(balanced.state.surge)<.5);
});

test('rudder and differential thrust combine coherently and rotation settles after neutral',()=>{
  const runTurn=(rudder:number)=>{const boat=new VesselDynamics();boat.state.surge=3;boat.setCommand({port:.65,starboard:-.65,rudder});run(boat,3);return boat;};
  const aligned=runTurn(1),opposed=runTurn(-1);assert.ok(aligned.state.yawRate>opposed.state.yawRate);
  const rate=aligned.state.yawRate;aligned.setCommand({port:0,starboard:0,rudder:0});aligned.step(1/60);assert.ok(aligned.state.yawRate>rate*.9);
  run(aligned,20);assert.ok(Math.abs(aligned.state.yawRate)<rate*.1);
});
test('a helm order in astern produces the opposite yaw response',()=>{
  const boat=new VesselDynamics();boat.setCommand({port:-.7,starboard:-.7});run(boat,60);boat.setCommand({rudder:.6});run(boat,20);
  assert.ok(boat.state.surge<0);assert.ok(boat.state.yawRate<-.003);
});
test('interpolation stays continuous through north and does not mutate physics',()=>{
  const boat=new VesselDynamics({x:0,z:0,heading:2*Math.PI-.001});boat.state.yawRate=.1;boat.step(1/60);
  const snapshot={...boat.state},out={...boat.state};boat.interpolate(.5,out);
  assert.ok(out.heading>6.28&&out.heading<6.29);assert.deepEqual(boat.state,snapshot);
});
test('Dinard quay also opposes a slow lateral docking approach',()=>{
  const boat=new VesselDynamics({x:-957,z:1120,heading:0}),contact=new ShoreContact();boat.state.sway=-.3;
  const initial={...contact.evaluate(boat.state)};assert.ok(initial.x>0);assert.equal(contact.label,'');assert.equal(contact.impactSpeed,0);
  for(let i=0;i<600;i++)boat.step(1/60,contact.evaluate(boat.state));
  assert.ok(boat.state.x>-959);assert.ok(Object.values(boat.state).every(Number.isFinite));
});
