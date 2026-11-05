import assert from 'node:assert/strict';import test from 'node:test';
import {ChannelTraffic,CHANNEL_TRAFFIC_PROFILE,vesselOverlap,trafficHullClear} from '../src/traffic/ChannelTraffic.ts';
import {ChannelNavigation} from '../src/core/ChannelNavigation.ts';
import {routePose,CHANNEL_LENGTH} from '../src/world/ChannelGeography.ts';
const player=(x=940,z=760,heading=0,surge=0)=>({x,z,heading,surge,sway:0,yawRate:0,port:0,starboard:0,rudder:0});
test('fleet has common-scale categories and two British local services with clear routes',()=>{
 const t=new ChannelTraffic();assert.ok(t.agents.length>20);for(const kind of ['cargo','ferry','sail','pleasure','launch'])assert.ok(t.agents.some(a=>a.route.kind===kind));assert.ok(t.agents.some(a=>a.route.length>300));assert.equal(t.agents.filter(a=>a.route.name.includes('britannique')).length,2);
 for(const a of t.agents)assert.ok(trafficHullClear(a.x,a.z,a.heading,a.route.length,a.route.beam));
});
test('all categories maintain bounded turn acceleration and speed change',()=>{
 const t=new ChannelTraffic(),p=player();for(let i=0;i<200;i++){const previous=t.agents.map(a=>({...a}));t.update(.1,p);t.agents.forEach((a,j)=>{const old=previous[j],h=Math.hypot(a.x-old.x,a.z-old.z);assert.ok(h<6);assert.ok(Math.abs(a.yawRate)<=CHANNEL_TRAFFIC_PROFILE[a.route.kind].turn+1e-9);assert.ok(trafficHullClear(a.x,a.z,a.heading,a.route.length,a.route.beam));});}
});
test('horn reactions are category-specific and rate-limited',()=>{
 const t=new ChannelTraffic(),small=t.agents.find(a=>a.route.kind==='pleasure')!,large=t.agents.find(a=>a.route.kind==='cargo')!;small.x=large.x=100;small.z=large.z=0;
 assert.equal(t.horn(player(0,0)),true);assert.equal(t.horn(player(0,0)),false);assert.ok(small.response>.5);assert.equal(large.response,0);
});
test('head-on traffic acts gradually while a stand-on cargo does not systematically yield',()=>{
 const t=new ChannelTraffic(),a=t.agents.find(a=>a.route.kind==='cargo')!;const p=player(a.x+800,a.z+1000,0,8);a.heading=0;a.speed=8;a.vx=0;a.vz=-8;t.update(.1,p);assert.ok(Math.abs(a.yawRate)<.0001);
 const heading=a.heading;t.update(.1,player(a.x,a.z-1800,Math.PI,8));assert.ok(Math.abs(a.heading-heading)<.001);
});
test('full-size collision query includes the bow and rejects clear passing',()=>{
 const t=new ChannelTraffic();for(const a of t.agents){a.x=1e6;a.z=1e6;}const a=t.agents[0];a.x=0;a.z=-170;a.heading=0;a.route={...a.route,length:310,beam:38};assert.ok(t.contact(player(0,0)));assert.equal(t.contact(player(100,0)),undefined);assert.equal(vesselOverlap({x:0,z:0,heading:0,length:195,beam:28},{x:100,z:0,heading:0,length:310,beam:38}),false);
});
test('simulation clock and IA trajectories agree at x1 x2 x4 x8',()=>{
 const results=[];for(const rate of [1,2,4,8]){const n=new ChannelNavigation();n.takeHelm();n.dynamics.environment.currentKnots=0;n.running=true;n.requestedRate=rate;for(let i=0;i<80/rate;i++)n.advance(.1);results.push(n.traffic.agents.map(a=>[a.x,a.z,a.heading]));assert.ok(Math.abs(n.traffic.elapsed-8)<1e-8);}for(const r of results.slice(1))r.forEach((p,i)=>p.forEach((v,j)=>assert.ok(Math.abs(v-results[0][i][j])<1e-7)));
});
test('port reservations protect a charging player and are released after leaving',()=>{const t=new ChannelTraffic();t.update(.1,player());assert.equal(t.berths.request('malo','ai'),false);t.update(.1,{...player(),x:3000});assert.equal(t.berths.request('malo','ai'),true);});

test('crossing encounter preserves a port-side stand-on course and avoids head-on',()=>{
 const encounter=(headOn:boolean)=>{const t=new ChannelTraffic(),a=t.agents.find(a=>a.route.kind==='cargo')!;for(const b of t.agents){b.x=1e6;b.z=1e6;}a.x=10000;a.z=-60000;a.heading=0;a.vx=0;a.vz=-8;a.speed=8;a.target=1;a.route={...a.route,points:[[10000,-60000],[10000,-100000],[20000,-100000]]};a.decision=0;
 t.update(.1,headOn?player(10000,-62000,Math.PI,8):player(9000,-61000,Math.PI/2,8));return a;};
 assert.equal(encounter(true).avoiding,true);assert.equal(encounter(false).avoiding,false);
});

test('fleet starts separated and cruises for ten minutes without a frozen overlap or shore contact',()=>{
 const t=new ChannelTraffic();for(let i=0;i<t.agents.length;i++)for(const b of t.agents.slice(i+1)){const a=t.agents[i];assert.equal(vesselOverlap({...a,length:a.route.length,beam:a.route.beam},{...b,length:b.route.length,beam:b.route.beam}),false);}
 const p=player(10000,-60000,0,8);for(let i=0;i<6000;i++){t.update(.1,p);for(const a of t.agents)assert.equal(a.phase,'sailing',a.route.id);}
});
