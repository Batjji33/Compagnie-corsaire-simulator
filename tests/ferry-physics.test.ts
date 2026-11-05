import assert from 'node:assert/strict';
import test from 'node:test';
import {HybridPlant,HYBRID_SPEC} from '../src/energy/HybridPlant.ts';
import {FerryDynamics} from '../src/physics/FerryDynamics.ts';
import {ChannelNavigation} from '../src/core/ChannelNavigation.ts';
import {BOAT,KNOT} from '../src/ships/parameters.ts';
const calm=()=>{const d=new FerryDynamics({x:0,z:0,heading:0});Object.assign(d.environment,{windKnots:0,currentKnots:0,waves:0});return d;};
const run=(d:FerryDynamics,seconds:number)=>{for(let i=0;i<seconds*10;i++)d.step(.1);};
test('energy conserves units and empty sources remove propulsion without generating fuel',()=>{
 const p=new HybridPlant();p.mode='electric';const initial=p.batteryKWh;p.step(.1,1000);
 assert.ok(Math.abs(initial-p.batteryKWh-1800/HYBRID_SPEC.efficiency*.1/3600)<1e-8);assert.equal(p.fuelKgHour,0);
 p.batteryKWh=0;assert.equal(p.step(.1,5000),0);assert.equal(p.deliveredKW,0);
 p.mode='hybrid';p.fuelKg=0;assert.equal(p.step(.1,5000),0);assert.equal(p.fuelKg,0);
});
test('combined mode substitutes battery energy and never exceeds rated shaft budget',()=>{
 const lng=new HybridPlant(),hybrid=new HybridPlant();lng.mode='lng';lng.step(.1,20000);hybrid.step(.1,20000);
 assert.ok(hybrid.fuelKgHour<lng.fuelKgHour);assert.ok(hybrid.batteryKW>0);assert.equal(lng.batteryKW,0);
 for(const mode of ['electric','lng','hybrid'] as const){hybrid.mode=mode;hybrid.step(.1,50000,5400);assert.ok(hybrid.deliveredKW<=HYBRID_SPEC.thermalKW);assert.ok(hybrid.batteryKW<=HYBRID_SPEC.electricKW);}
});
test('shore charging interlocks on berth position, speed, heading and neutral controls',()=>{
 const n=new ChannelNavigation();n.takeHelm();assert.equal(n.toggleCharge(),true);const initial=n.dynamics.plant.batteryKWh;n.running=true;n.advance(.1);assert.ok(n.dynamics.plant.batteryKWh>initial);assert.equal(n.state.surge,0);
 assert.equal(n.toggleCharge(),true);n.state.surge=1;assert.equal(n.toggleCharge(),false);n.state.surge=0;n.dynamics.setCommand({port:.3});assert.equal(n.toggleCharge(),false);n.dynamics.setCommand({port:0});n.state.x+=1000;assert.equal(n.toggleCharge(),false);
 const p=n.dynamics.plant;p.shore=true;p.batteryKWh=HYBRID_SPEC.batteryKWh;p.step(.1,0);assert.equal(p.chargeKW,0);
});
test('large ferry accelerates over minutes, coasts and brakes with finite reversing delay',()=>{
 const d=calm();d.plant.mode='lng';d.setCommand({port:1,starboard:1});run(d,10);assert.ok(d.state.surge<1);run(d,590);const cruise=d.state.surge;assert.ok(cruise>20*KNOT&&cruise<24*KNOT);
 d.setCommand({port:0,starboard:0});run(d,10);assert.ok(d.state.surge>cruise*.8);
 d.setCommand({port:-1,starboard:-1});const before=d.state.surge;run(d,1);assert.ok(d.state.surge>before*.9);run(d,240);assert.ok(d.state.surge<1);
 console.log({cruiseKnots:cruise/KNOT,afterBrake:d.state.surge});assert.equal(BOAT.mass,47500);
});
test('turning circle is ship-sized and thrusters weaken with forward speed',()=>{
 const d=calm();d.setCommand({port:1,starboard:1});run(d,600);d.setCommand({rudder:1});run(d,300);const radius=Math.abs(d.state.surge/d.state.yawRate);assert.ok(radius>300&&radius<2000);console.log({turnRadius:radius,rateDegrees:d.state.yawRate*180/Math.PI});
 const a=calm(),b=calm();a.bowCommand=b.bowCommand=1;b.state.surge=10;run(a,10);run(b,10);assert.ok(Math.abs(a.state.yawRate)>Math.abs(b.state.yawRate));
});
test('current and wind act on an unpowered vessel; settings remain finite',()=>{
 const d=calm();d.environment.currentKnots=1;d.environment.currentTo=90;run(d,60);assert.ok(Math.abs(d.state.x-60*KNOT)<.01);
 d.environment.windKnots=25;d.environment.windFrom=270;run(d,300);assert.ok(d.state.sway>0);assert.ok(Object.values(d.state).every(Number.isFinite));
});

test('switching modes underway changes energy allocation without teleporting or stepping velocity',()=>{
 const d=calm();d.setCommand({port:.65,starboard:.65});run(d,180);
 for(const mode of ['electric','lng','hybrid'] as const){const before={...d.state};d.plant.mode=mode;d.step(.1);assert.ok(Math.hypot(d.state.x-before.x,d.state.z-before.z)<2);assert.ok(Math.abs(d.state.surge-before.surge)<.02);assert.ok(d.plant.batteryKWh>=0);}
});
test('port thrusters permit gradual control and heading interlock prevents wrong-way shore connection',()=>{
 const d=calm();d.bowCommand=.5;run(d,10);assert.ok(Math.abs(d.state.sway)<.2);assert.ok(Math.abs(d.state.heading)<.05);assert.ok(d.state.yawRate>0);
 const n=new ChannelNavigation();n.takeHelm();n.state.heading=Math.PI/2;assert.equal(n.toggleCharge(),false);
});

test('shore connection rejects ground drift and a bow thruster still running down',()=>{
 const n=new ChannelNavigation();n.takeHelm();n.dynamics.environment.currentKnots=1;assert.equal(n.toggleCharge(),false);
 n.dynamics.environment.currentKnots=0;n.dynamics.bowActual=.1;assert.equal(n.toggleCharge(),false);
 n.dynamics.bowActual=0;assert.equal(n.toggleCharge(),true);
});
