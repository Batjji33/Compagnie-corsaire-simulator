import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Traffic,closestApproach,navigable,trafficDensity,TRAFFIC_ROUTES,TRAFFIC_LIMITS,TRAFFIC_TURN_RATE } from '../src/traffic/Traffic.ts';
import { BOAT } from '../src/ships/parameters.ts';
import { Passengers } from '../src/passengers/Passengers.ts';
import { TourGuide,validateComment,DEFAULT_COMMENTS } from '../src/excursions/comments.ts';
import { MaritimeAudio,readAudio,audioLevels } from '../src/audio/MaritimeAudio.ts';
import { VesselDynamics } from '../src/physics/VesselDynamics.ts';
import { Marine } from '../src/weather/Marine.ts';
import { FixedStep } from '../src/core/FixedStep.ts';
import { Mission } from '../src/missions/Mission.ts';
import { MALO_DINARD } from '../src/missions/definitions.ts';
import { validRun,readMarine } from '../src/saves/GameStore.ts';

test('closest-approach prediction distinguishes crossing, passing clear and moving away',()=>{
  const a={x:0,z:0,vx:0,vz:-5},b={x:0,z:-100,vx:0,vz:5};
  assert.deepEqual(closestApproach(a,b),{distance:0,seconds:10,closing:true});
  assert.ok(closestApproach(a,{...b,x:100}).distance>=100);
  assert.equal(closestApproach(a,{...b,vz:-10}).closing,false);
  assert.ok(Number.isFinite(closestApproach({...a,vz:0},{...b,vz:0}).distance));
});
test('24 vessels in five families follow safe bounded routes with gradual motion',()=>{
  const t=new Traffic(),player=new VesselDynamics({x:4000,z:4000,heading:0});
  assert.equal(new Set(TRAFFIC_ROUTES.map(r=>r.kind)).size,5);assert.equal(t.agents.length,24);
  const initial=t.agents.map(a=>({x:a.x,z:a.z}));let changedHeading=false;
  for(let i=0;i<120*60;i++){
    const old=t.agents.map(a=>a.heading);t.update(1/60,player.state,14,.4,9000);
    for(const [j,a] of t.agents.entries()){
      assert.ok([a.x,a.z,a.speed,a.heading].every(Number.isFinite));
      assert.ok(navigable(a.x,a.z,a.route.length/2),a.route.name);
      assert.ok(Math.abs(a.heading-old[j])<=TRAFFIC_TURN_RATE[a.route.kind]/60+1e-9);
      assert.ok(a.speed<=a.route.knots*1852/3600+1e-9);
      if(Math.abs(a.heading-old[j])>.0001)changedHeading=true;
    }
  }
  assert.ok(changedHeading);assert.ok(t.agents.every((a,i)=>Math.hypot(a.x-initial[i].x,a.z-initial[i].z)>20));
  assert.equal(t.agents.filter(a=>a.active).length,24);
});
test('traffic density responds to hour, weather and quality without spawning next to player',()=>{
  assert.equal(trafficDensity(14,.3,8000),24);assert.equal(trafficDensity(2,.3,8000),9);assert.equal(trafficDensity(14,2.5,2000),12);
  const t=new Traffic(),p=new VesselDynamics({x:4000,z:4000,heading:0});t.limit=TRAFFIC_LIMITS.low;t.update(.016,p.state,14,.3,8000);assert.equal(t.agents.filter(a=>a.active).length,18);
  t.update(.016,p.state,2,2.5,1500);assert.equal(t.agents.filter(a=>a.active).length,9);
  t.enabled=false;t.update(.016,p.state,14,.3,8000);assert.ok(t.agents.every(a=>!a.active));
  const near=new Traffic(),first=near.agents[0];p.state.x=first.x;p.state.z=first.z;near.update(.016,p.state,14,.3,8000);assert.equal(first.active,false);
});

test('cargos have 4–5 Corsaire lengths, safe offshore loops and room to spawn',()=>{
  const cargos=TRAFFIC_ROUTES.filter(r=>r.kind==='cargo');assert.equal(cargos.length,4);
  for(const r of cargos){
    assert.ok(r.length/BOAT.length>=4&&r.length/BOAT.length<=5);assert.ok(r.beam>=18&&r.beam<=22);assert.equal(r.loop,true);
    for(let i=0;i<r.points.length;i++){
      const p=r.points[i],q=r.points[(i+1)%r.points.length];
      for(let t=0;t<=1;t+=.02)assert.ok(navigable(p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t,r.length/2),r.id);
    }
  }
  const traffic=new Traffic(),a=traffic.agents.find(a=>a.route.kind==='cargo')!,player=new VesselDynamics({x:a.x+220,z:a.z,heading:0});
  traffic.update(1/60,player.state,14,.3,9000);assert.equal(a.active,false);
  const initial=new Traffic();initial.update(1/60,new VesselDynamics().state,14,.3,9000);
  for(const agent of initial.agents.filter(a=>a.active))assert.ok(Math.hypot(agent.x-BOAT.spawn.x,agent.z-BOAT.spawn.z)>180+(agent.route.length+BOAT.length)/2);
});

test('large cargo collision capsules include the bow and retain close risk warnings at rest',()=>{
  const t=new Traffic(),a=t.agents.find(a=>a.route.kind==='cargo')!,b=new VesselDynamics({x:0,z:0,heading:0});
  Object.assign(a,{active:true,x:0,z:0,heading:0,vx:0,vz:0});
  b.state.z=-a.route.length/2-BOAT.length/2+2;b.state.surge=-1;
  const contact=t.contacts(b.state);assert.ok(contact.label);assert.ok(contact.z<0);assert.ok(contact.impact>0);
  t.detectRisk(b.state);assert.equal(t.risk?.id,a.route.id);
  b.state.z=-a.route.length;assert.equal(t.contacts(b.state).label,'');
});
test('autonomous vessel slows and turns starboard for a predicted close crossing',()=>{
  const t=new Traffic(),boat=new VesselDynamics({x:0,z:0,heading:0});boat.state.surge=5;
  t.agents.forEach(a=>a.active=false);t.limit=1;
  const a=t.agents[0];Object.assign(a,{active:true,x:0,z:-120,heading:Math.PI,speed:4,vx:0,vz:4,desiredHeading:Math.PI,desiredSpeed:4,target:0,aiTime:0});
  t.detectRisk(boat.state);assert.equal(t.risk?.id,a.route.id);
  t.update(1/60,boat.state,14,.3,8000);assert.ok(a.avoiding);assert.ok(a.desiredSpeed<a.route.knots*.5145*.5);
  a.z=-200;a.vz=-10;boat.state.surge=0;t.detectRisk(boat.state);assert.equal(t.risk,undefined);
});
test('traffic contact opposes approach and uses the existing damage toggle',()=>{
  const t=new Traffic(),b=new VesselDynamics({x:0,z:0,heading:0}),m=new Marine();b.state.surge=5;
  const a=t.agents[0];Object.assign(a,{active:true,x:0,z:-9,heading:Math.PI,vx:0,vz:4});
  const f=t.contacts(b.state);assert.ok(f.impact>0);assert.ok(f.z>0);assert.ok(f.label);
  m.hazards(b.state,f.label,f.impact,1/60);assert.ok(m.damage>0);
  m.damage=0;m.damageEnabled=false;m.hazards(b.state,f.label,f.impact,1/60);assert.equal(m.damage,0);
  b.step(1/60,f);assert.ok(Object.values(b.state).every(Number.isFinite));
});
test('traffic stays deterministic under the existing fixed step at different rendering rates',()=>{
  const run=(fps:number)=>{const t=new Traffic(),b=new VesselDynamics(),clock=new FixedStep(1/60,.15,8);for(let i=0;i<fps*8;i++)clock.advance(1/fps,dt=>t.update(dt,b.state,14,.6,7000));return t.agents.map(a=>[a.x,a.z,a.heading]);};
  assert.deepEqual(run(30),run(144));
});
test('passenger counts match timed boarding and unloading without changing mission objectives',()=>{
  const p=new Passengers();p.update(1/60,'boarding',9,180,18,12,0,0,.3);assert.equal(p.count,90);
  p.update(1/60,'departure',0,180,18,12,0,0,.3);assert.equal(p.count,180);
  p.update(1/60,'unloading',6,180,18,12,0,0,.3);assert.equal(p.count,90);
  p.update(1/60,'complete',0,180,18,12,0,0,.3);assert.equal(p.count,0);
  p.update(1/60,'free',0,48,18,12,0,0,.3);assert.equal(p.count,48);
});
test('sea, acceleration and turning lower satisfaction; pause and snapshot do not create false shocks',()=>{
  const calm=new Passengers(),rough=new Passengers();
  for(let i=0;i<3600;i++){calm.update(1/60,'crossing',0,180,18,12,6,0,.2);rough.update(1/60,'crossing',0,180,18,12,i%60===0?9:6,.2,2);}
  assert.ok(rough.satisfaction<calm.satisfaction);assert.ok(rough.satisfaction>=0);
  const restored=new Passengers();restored.reset(calm.snapshot());restored.update(1/60,'crossing',0,180,18,12,6,0,.2);assert.equal(restored.satisfaction,calm.satisfaction);
  const snapshot=restored.snapshot();assert.deepEqual(restored.snapshot(),snapshot);
});
test('tourism proposals are geofenced, once per trip, and wait for manual approval',()=>{
  const g=new TourGuide(),c=g.update(1,920,264);assert.equal(c?.id,'remparts');
  assert.equal(g.update(200,-945,1120),undefined);assert.equal(g.selected?.id,'remparts');
  g.dismiss();const next=g.update(31,-945,1120);assert.equal(next?.id,'clair-lune');
  g.dismiss();assert.equal(g.update(31,920,264),undefined);
  g.reset();assert.equal(g.update(1,920,264)?.id,'remparts');
});
test('automatic comments can continue; mute blocks triggers and personal text validates safely',()=>{
  const g=new TourGuide();g.manual=false;g.update(1,920,264);assert.ok(g.update(50,-945,1120));
  g.reset();g.muted=true;assert.equal(g.update(1,920,264),undefined);
  const c={...DEFAULT_COMMENTS[0],id:'custom',title:'Mon récit',text:'Un texte personnel <script> reste du texte.',source:'javascript:alert(1)'};
  assert.equal(validateComment(c)?.source,'');assert.equal(validateComment({...c,radius:0}),null);assert.equal(validateComment({...c,text:'a'.repeat(1501)}),null);assert.equal(validateComment({...c,x:Infinity}),null);
});
test('audio is bounded, responds to physics, and has a textual fallback without French speech',()=>{
  const prefs=readAudio({enabled:true,master:12,voice:-4,engines:NaN});assert.equal(prefs.master,1);assert.equal(prefs.voice,0);assert.equal(prefs.engines,.45);
  const b=new VesselDynamics(),idle=audioLevels(b.state,.2,2);b.state.port=b.state.starboard=1;const underway=audioLevels(b.state,2,25);assert.ok(underway.engine>idle.engine);assert.ok(underway.wave>idle.wave);assert.ok(underway.wind>idle.wind);
  const audio=new MaritimeAudio();audio.apply({...readAudio({enabled:true}),voice:1});assert.equal(audio.speak('Bienvenue',true),false);assert.match(audio.voiceStatus,/française indisponible/);audio.dispose();
});
test('old mission saves remain valid and added passenger snapshots reject malformed values',()=>{
  const m=new Mission(MALO_DINARD);m.board();const b=new VesselDynamics(),base={missionId:m.definition.id,mission:m.state,vessel:b.state,command:b.command,marine:readMarine({}),damage:0};
  assert.ok(validRun(base));assert.ok(validRun({...base,passengers:{satisfaction:90,discomfort:5},tourVisited:['remparts']}));assert.equal(validRun({...base,passengers:{satisfaction:Infinity,discomfort:0}}),false);
});
