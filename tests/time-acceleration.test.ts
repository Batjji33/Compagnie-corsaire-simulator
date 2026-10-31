import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FixedStep } from '../src/core/FixedStep.ts';
import { TIME_RATES, TimeAcceleration } from '../src/core/TimeAcceleration.ts';
import { accelerationDanger } from '../src/core/navigationSafety.ts';
import type { NavigationSafety } from '../src/core/navigationSafety.ts';
import { VesselDynamics } from '../src/physics/VesselDynamics.ts';
import { ShoreContact } from '../src/physics/ShoreContact.ts';
import { Marine } from '../src/weather/Marine.ts';
import { WaveField } from '../src/weather/Waves.ts';
import { Traffic } from '../src/traffic/Traffic.ts';
import { Mission } from '../src/missions/Mission.ts';
import { MISSIONS, MALO_DINARD } from '../src/missions/definitions.ts';
import { FerryService } from '../src/missions/FerryService.ts';
import { BOAT, SAINT_MALO } from '../src/ships/parameters.ts';
import { TourGuide } from '../src/excursions/comments.ts';

const pose={x:-4500,z:-4300,heading:Math.PI/2};
function setup():NavigationSafety {
  const dynamics=new VesselDynamics(pose),mission=new Mission(MALO_DINARD),traffic=new Traffic();
  mission.state.phase='crossing';mission.state.released=true;
  traffic.enabled=false;
  return {state:dynamics.state,boat:BOAT,shore:new ShoreContact(),marine:new Marine(),traffic,mission};
}
const telemetry=(d:VesselDynamics,m:Marine)=>({...d.state,speed:Math.hypot(d.state.surge,d.state.sway),commandPort:d.command.port,commandStarboard:d.command.starboard,contact:'',damage:m.damage,clearance:m.clearance});

for(const rate of TIME_RATES)for(const fps of [30,60,144])test(`30 simulated minutes at x${rate}, ${fps} FPS`,()=>{
  const clock=new FixedStep(1/60,.15,64);
  let count=0;
  for(let frame=0;frame<1800/rate*fps;frame++)clock.advance(1/fps,dt=>{assert.equal(dt,1/60);count++;},()=>rate);
  assert.equal(count,1800*60);
  assert.ok(Math.abs(clock.time-1800)<1e-6);
});

test('a mid-frame safety reset consumes the remaining real time at x1',()=>{
  const clock=new FixedStep(1/60,.15,64),acceleration=new TimeAcceleration();
  acceleration.select(8);
  let count=0;
  clock.advance(1/30,()=>{count++;acceleration.enforce('danger');},()=>acceleration.multiplier);
  assert.equal(count,2);assert.equal(acceleration.multiplier,1);
  acceleration.enforce(undefined);assert.equal(acceleration.multiplier,1);
  assert.equal(acceleration.select(4,'port'),false);assert.equal(acceleration.multiplier,1);
  assert.equal(acceleration.select(2),true);assert.equal(acceleration.multiplier,2);
});

test('pause inside a substep interrupts catch-up without skipping a mission event',()=>{
  const clock=new FixedStep(1/60,.15,64);let active=true,count=0;
  clock.advance(.1,()=>{count++;active=false;},()=>8,()=>active);
  assert.equal(count,1);
  active=true;clock.advance(1/60,()=>count++,()=>1,()=>active);
  assert.equal(count,2);
});

test('all rates preserve physics, real knots, weather, waves, dense traffic and service timing',()=>{
  const simulate=(rate:number,boat:typeof BOAT)=>{
    const d=new VesselDynamics(pose),marine=new Marine(),water=new WaveField(),traffic=new Traffic(),service=new FerryService(undefined,undefined,boat);
    d.parameters=marine.parameters=traffic.playerBoat=boat;
    marine.dayCycle=false;marine.evolving=false;marine.sea='calme';marine.visibility=10000;marine.hour=14;
    traffic.limit=24;
    service.mission.state.phase='crossing';service.mission.state.released=true;
    const clock=new FixedStep(1/60,.15,64);
    for(let frame=0;frame<60/rate*30;frame++)clock.advance(1/30,dt=>{
      // Commands in simulation time exercise engine response, inertia and rudder.
      d.setCommand({port:clock.time<40?.75:0,starboard:.75,rudder:clock.time>20&&clock.time<35?.2:0});
      traffic.update(dt,d.state,marine.hour,marine.waves,marine.visibility);
      marine.update(dt);water.update(dt,marine);d.step(dt,marine.forces(d.state));
      marine.hazards(d.state,'',0,dt);service.update(dt,telemetry(d,marine),90);
      marine.hour=service.hour;
    },()=>rate);
    return {state:{...d.state},hour:marine.hour,tide:marine.tide,waves:marine.waves,water:water.height(d.state.x,d.state.z),
      agents:traffic.agents.map(a=>[a.x,a.z,a.heading,a.speed,a.active]),elapsed:service.state.elapsed,delay:service.delay,slot:service.slotRemaining};
  };
  for(const boat of [BOAT,SAINT_MALO]){
    const normal=simulate(1,boat);
    assert.ok(normal.agents.filter(a=>a[4]).length>=24,'dense traffic is active');
    for(const rate of [2,4,8])assert.deepEqual(simulate(rate,boat),normal);
  }
});

test('open water allows every rate, immediate danger blocks every accelerated rate',()=>{
  const c=setup(),acceleration=new TimeAcceleration();
  assert.equal(accelerationDanger(c),undefined);
  for(const rate of TIME_RATES){assert.equal(acceleration.select(rate,accelerationDanger(c)),true);}
  c.actionPending=true;
  for(const rate of [2,4,8] as const){assert.equal(acceleration.select(rate,accelerationDanger(c)),false);assert.equal(acceleration.multiplier,1);}
  c.actionPending=false;
  assert.equal(acceleration.enforce(accelerationDanger(c)),false);assert.equal(acceleration.multiplier,1);
});

test('relative trajectories anticipate a collision beyond the existing 450 m alert range',()=>{
  const c=setup(),a=c.traffic.agents[0];c.traffic.enabled=true;
  c.traffic.agents.forEach(b=>b.active=false);
  c.state.surge=8;
  Object.assign(a,{active:true,x:c.state.x+700,z:c.state.z,vx:-18,vz:0,speed:18,heading:-Math.PI/2});
  assert.match(accelerationDanger(c)??'',/collision/);
  a.vx=18;a.heading=Math.PI/2;
  assert.equal(accelerationDanger(c),undefined,'receding vessel does not prevent acceleration');
});

test('turning towards a thin obstacle is predicted before the tangent intersects it',()=>{
  const c=setup();c.state.surge=8;c.state.yawRate=.05;
  c.shore.obstacles.length=0;
  // After 15 s on the arc: roughly 110 m east and 43 m south.
  c.shore.obstacles.push({name:'Thin quay',kind:'quay',polygon:[[-4400,-4255],[-4380,-4255],[-4380,-4254.5],[-4400,-4254.5]]});
  assert.match(accelerationDanger(c)??'',/quai/);
});

test('coasts, rocks, narrow passages and low-tide shoals prevent acceleration',()=>{
  const c=setup();
  Object.assign(c.state,{x:-4500,z:-4300,surge:8});
  c.shore.obstacles.push({name:'Coast ahead',kind:'shore',polygon:[[-4350,-4400],[-4349,-4400],[-4349,-4200],[-4350,-4200]]});
  assert.match(accelerationDanger(c)??'',/côte|passage/);
  c.shore.obstacles.length=0;
  Object.assign(c.state,{x:-340,z:-560,surge:0});
  assert.match(accelerationDanger(c)??'',/rochers/);
  Object.assign(c.state,{x:-150,z:150,surge:0});c.marine.tide=-2.4;c.marine.tidePhase=-Math.PI/2;
  assert.match(accelerationDanger(c)??'',/haut-fond/);
});

test('a curved player trajectory also anticipates traffic outside its straight course',()=>{
  const c=setup(),a=c.traffic.agents[0];c.traffic.enabled=true;
  c.traffic.agents.forEach(b=>b.active=false);
  c.state.surge=8;c.state.yawRate=.05;
  Object.assign(a,{active:true,x:pose.x+160,z:pose.z+105,vx:0,vz:0,speed:0});
  assert.match(accelerationDanger(c)??'',/collision/);
});

for(const rate of TIME_RATES)test(`x${rate} keeps hull contact substeps and returns to x1 before a quay`,()=>{
  const c=setup(),d=new VesselDynamics(pose),clock=new FixedStep(1/60,.15,64),acceleration=new TimeAcceleration();
  c.state=d.state;c.shore.obstacles.length=0;
  c.shore.obstacles.push({name:'Quay',kind:'quay',polygon:[[-4000,-4500],[-3980,-4500],[-3980,-4100],[-4000,-4100]]});
  d.state.surge=8;d.setCommand({port:1,starboard:1});
  acceleration.select(rate);
  let nextSafety=0,resetX:number|undefined,contactSteps=0,frames=0;
  while(clock.time<90&&frames++<6000)clock.advance(1/30,dt=>{
    if(clock.time>=nextSafety){
      if(acceleration.enforce(accelerationDanger(c)))resetX=d.state.x;
      nextSafety=clock.time+.1;
    }
    const force=c.shore.evaluate(d.state);
    if(Math.hypot(force.x,force.z)>0)contactSteps++;
    d.step(dt,force);
    assert.ok(d.state.x<-3980,'hull cannot pass through the quay');
  },()=>acceleration.multiplier);
  assert.ok(contactSteps>0,'the existing contact solver ran');
  if(rate>1){assert.ok(resetX!==undefined&&resetX<-4200,'normal rate is restored over 200 m before the quay');assert.equal(acceleration.multiplier,1);}
});

for(const definition of MISSIONS)test(`port and mandatory waypoint protection: ${definition.id}`,()=>{
  const c=setup();c.mission=new Mission(definition);c.mission.state.phase='crossing';c.mission.state.released=true;
  const berth=definition.destination.berth;
  Object.assign(c.state,{...berth,z:berth.z+definition.destination.approachRadius+100,heading:0,surge:8});
  assert.ok(accelerationDanger(c),'return to normal before arriving');
  c.mission.state.phase='docking';assert.match(accelerationDanger(c)??'',/port/);
  if(definition.excursion){
    const index=definition.route.findIndex(p=>p.dwellSeconds);
    const target=index<0?0:index;
    c.mission.state.phase='crossing';c.mission.state.visited=Array.from({length:target},(_,i)=>i);
    Object.assign(c.state,{...definition.route[target],surge:0});
    assert.match(accelerationDanger(c)??'',/étape|port/);
  }
});

test('mandatory panorama dwell and order are preserved at x1, x2, x4 and x8',()=>{
  for(const rate of TIME_RATES){
    const def={...MALO_DINARD,excursion:{source:'test',reference:'test'},route:[{...pose,label:'Panorama',radius:100,dwellSeconds:15,maxKnots:5},{x:pose.x+400,z:pose.z,label:'Next'}]};
    const mission=new Mission(def),d=new VesselDynamics(pose),marine=new Marine(),clock=new FixedStep(1/60,.15,64);
    mission.state.phase='crossing';mission.state.released=true;
    for(let frame=0;frame<16/rate*30;frame++)clock.advance(1/30,dt=>mission.update(dt,telemetry(d,marine)),()=>rate);
    assert.deepEqual(mission.state.visited,[0]);assert.equal(mission.waypointIndex,1);assert.equal(mission.finished,false);
  }
});

test('manual tourist events require acknowledgement, automatic ones do not block',()=>{
  const guide=new TourGuide(),comment=guide.comments[0];
  guide.offer(comment);assert.equal(guide.actionPending,true);
  guide.choose(comment.id);assert.equal(guide.actionPending,false);
  guide.dismiss();guide.reset();guide.manual=false;guide.offer(comment);assert.equal(guide.actionPending,false);
});
