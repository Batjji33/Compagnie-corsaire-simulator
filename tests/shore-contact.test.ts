import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ShoreContact } from '../src/physics/ShoreContact.ts';
import { VesselDynamics } from '../src/physics/VesselDynamics.ts';
import { BOAT } from '../src/ships/parameters.ts';
import { Marine } from '../src/weather/Marine.ts';
import { Mission, dockingStatus } from '../src/missions/Mission.ts';
import { MALO_DINARD } from '../src/missions/definitions.ts';
import { ROCKS } from '../src/world/geography.ts';
import type { Point } from '../src/world/geography.ts';

test('side fenders retain quay repulsion at both ports without warnings, damage or mission penalties',()=>{
  for(const pose of [{x:-957,z:1120,heading:0,sway:-1},{x:920,z:258,heading:-Math.PI/2,sway:-1}]){
    const boat=new VesselDynamics(pose),contact=new ShoreContact(),marine=new Marine();boat.state.sway=pose.sway;
    const force=contact.evaluate(boat.state);
    assert.ok(Math.hypot(force.x,force.z)>0);assert.equal(contact.label,'');assert.equal(contact.impactSpeed,0);
    marine.hazards(boat.state,contact.label,contact.impactSpeed,1/60);assert.equal(marine.damage,0);assert.doesNotMatch(marine.warning,/Contact/);
    const mission=new Mission(MALO_DINARD);mission.state.phase='docking';mission.state.released=true;
    const telemetry={...boat.state,speed:1,commandPort:0,commandStarboard:0,contact:contact.label,damage:marine.damage,clearance:marine.clearance};
    mission.update(1/60,telemetry);assert.equal(mission.state.metrics.contacts,0);
    if(pose.x<0)assert.ok(dockingStatus(MALO_DINARD,telemetry).valid);
  }
});

test('bow and stern impacts on the Dinard quay still count and damage the hull',()=>{
  for(const [heading,surge] of [[-Math.PI/2,4],[Math.PI/2,-4]]){
    const boat=new VesselDynamics({x:-947,z:1120,heading}),contact=new ShoreContact(),marine=new Marine();boat.state.surge=surge;
    assert.ok(contact.evaluate(boat.state).x>0);assert.match(contact.label,/Clair de Lune/);assert.ok(contact.impactSpeed>=3.99);
    marine.hazards(boat.state,contact.label,contact.impactSpeed,1/60);assert.ok(marine.damage>.1);assert.match(marine.warning,/Contact/);
    const telemetry={...boat.state,speed:0,commandPort:0,commandStarboard:0,contact:contact.label,damage:marine.damage,clearance:marine.clearance};
    assert.equal(dockingStatus(MALO_DINARD,telemetry).valid,false);
    const mission=new Mission(MALO_DINARD);mission.state.phase='docking';mission.state.released=true;mission.update(1/60,telemetry);assert.equal(mission.state.metrics.contacts,1);
  }
});

test('lateral fender protection follows boat orientation and is limited to quay obstacles',()=>{
  for(const heading of [0,Math.PI/2,Math.PI,3*Math.PI/2])for(const side of [-1,1])for(const kind of ['quay','shore'] as const){
    const sin=Math.sin(heading),cos=Math.cos(heading);
    const point=(lateral:number,forward:number):Point=>[10000+cos*lateral+sin*forward,10000+sin*lateral-cos*forward];
    const [x,z]=point(side*(BOAT.beam/2-.5),0),boat=new VesselDynamics({x,z,heading}),contact=new ShoreContact();boat.state.sway=-side*2;
    contact.obstacles.length=0;
    contact.obstacles.push({name:'Test wall',kind,polygon:[point(0,-100),point(-side*20,-100),point(-side*20,100),point(0,100)]});
    const force=contact.evaluate(boat.state);assert.ok((force.x*cos+force.z*sin)*side>0);
    assert.equal(Boolean(contact.label),kind==='shore');assert.equal(contact.impactSpeed>0,kind==='shore');
  }
});

test('a fendered quay contact does not hide another shore contact with shallower penetration',()=>{
  const boat=new VesselDynamics({x:BOAT.beam/2-.5,z:10000,heading:0}),contact=new ShoreContact();boat.state.sway=-2;
  contact.obstacles.length=0;
  for(const [kind,offset] of [['quay',0],['shore',-.1]] as const)contact.obstacles.push({name:kind,kind,polygon:[[offset-20,9900],[offset,9900],[offset,10100],[offset-20,10100]]});
  assert.ok(contact.evaluate(boat.state).x>0);assert.equal(contact.label,'shore');assert.ok(contact.impactSpeed>1.99);
});

test('rock impacts remain counted on the side of the hull',()=>{
  const rock=ROCKS[0],boat=new VesselDynamics({x:rock.x+rock.radius*.7+BOAT.beam/2-.5,z:rock.z,heading:0}),contact=new ShoreContact();boat.state.sway=-2;
  contact.obstacles.length=0;
  assert.ok(contact.evaluate(boat.state).x>0);assert.equal(contact.label,'Rochers');assert.ok(contact.impactSpeed>1.99);
});
