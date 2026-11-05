import assert from 'node:assert/strict';
import test from 'node:test';
import { CHANNEL_LENGTH, CHANNEL_ROUTE, CHANNEL_BERTHS, CHANNEL_LANDS, project, unproject, routePose, ferryContact, channelContact, navigationZone, ROUTE_DISTANCES } from '../src/world/ChannelGeography.ts';
import { ChannelNavigation } from '../src/core/ChannelNavigation.ts';

test('geographic coordinates round trip and regional distance retains a real metre scale',()=>{
 for(const [lon,lat] of [[-2.025,48.645],[-1.0935,50.818],[-2.58,49.45],[-2.14,49.215]]){const p=project(lon,lat),geo=unproject(...p);assert.ok(Math.abs(geo.lon-lon)<1e-10);assert.ok(Math.abs(geo.lat-lat)<1e-10);}
 assert.ok(CHANNEL_LENGTH>250000&&CHANNEL_LENGTH<320000);
 const north=project(-2,50),south=project(-2,49);assert.ok(Math.abs(Math.hypot(north[0]-south[0],north[1]-south[1])-111195)<1);
});
test('full ferry footprint clears both harbours and every route leg including smoothed corner headings',()=>{
 for(let d=0;d<=CHANNEL_LENGTH;d+=20){const p=routePose(d),a=routePose(d-60),b=routePose(d+60),heading=Math.atan2(b.x-a.x,a.z-b.z);assert.equal(ferryContact(p.x,p.z,heading),undefined,`distance ${d}`);}
 for(const b of CHANNEL_BERTHS){assert.ok(b.length>=194.7&&b.width>=27.8&&b.depth>6.6);assert.equal(ferryContact(...b.point,b.heading),undefined);}
});
test('route joins are position continuous, with no island stop and no coordinate jumps',()=>{
 for(const d of ROUTE_DISTANCES.slice(1,-1)){const a=routePose(d-.01),b=routePose(d+.01);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<=.021);}
 assert.deepEqual(CHANNEL_ROUTE[0],CHANNEL_BERTHS[0].point);assert.deepEqual(CHANNEL_ROUTE.at(-1),CHANNEL_BERTHS[1].point);
 for(const [lon,lat] of [[-2.14,49.215],[-2.58,49.45],[-2.36,49.43],[-1.28,50.66]])assert.ok(channelContact(...project(lon,lat)));
});
test('navigation zones clamp accelerated time and manual mode returns to real time',()=>{
 const nav=new ChannelNavigation();nav.requestedRate=128;assert.equal(nav.rate,4);nav.running=true;const old={...nav.state};nav.advance(.1);assert.ok(Math.hypot(nav.state.x-old.x,nav.state.z-old.z)<2);
 Object.assign(nav.state,routePose(CHANNEL_LENGTH/2));assert.equal(navigationZone(nav.state.x,nav.state.z),'offshore');assert.equal(nav.rate,128);
 nav.takeHelm();assert.equal(nav.rate,1);assert.equal(nav.running,false);
});
test('manual movement is swept in small steps and stops before land',()=>{
 const nav=new ChannelNavigation();nav.takeHelm();nav.dynamics.reset({x:800,z:800,heading:Math.PI/2});nav.state.surge=12;nav.running=true;
 for(let i=0;i<500;i++){nav.advance(.1);if(!nav.running)break;}
 assert.equal(nav.running,false);assert.ok(nav.collision);assert.equal(nav.dynamics.groundSpeed,0);assert.equal(ferryContact(nav.state.x,nav.state.z,nav.state.heading),undefined);
});
test('regional land data is finite and no changes to legacy land are needed',()=>{
 assert.ok(CHANNEL_LANDS.length>=15);for(const l of CHANNEL_LANDS){assert.ok(l.outline.length>=3);assert.ok(l.outline.every(p=>p.every(Number.isFinite)));}
});

test('guided reconnaissance reaches Portsmouth continuously with automatic harbour slowdown',()=>{
 const nav=new ChannelNavigation();nav.running=true;nav.requestedRate=128;let steps=0;
 while(nav.running&&steps++<30000){const old={...nav.state};nav.advance(.1);assert.ok(Math.hypot(nav.state.x-old.x,nav.state.z-old.z)<152);}
 assert.equal(nav.collision,'');assert.equal(nav.distance,CHANNEL_LENGTH);assert.equal(nav.state.surge,0);assert.ok(steps<30000);
});
