import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Berths,TAXI_PORTS} from '../src/traffic/Berths.ts';
import {Traffic,navigable} from '../src/traffic/Traffic.ts';
import {TAXI_CRUISE_KNOTS,TAXI_STOPOVER_SECONDS} from '../src/traffic/WaterTaxis.ts';
import {KNOT} from '../src/ships/parameters.ts';
import {CROSSING_SECONDS} from '../src/missions/FerryService.ts';
import {VesselDynamics} from '../src/physics/VesselDynamics.ts';
import {ShoreContact} from '../src/physics/ShoreContact.ts';
import {FixedStep} from '../src/core/FixedStep.ts';
import {MaritimeAudio,readAudio} from '../src/audio/MaritimeAudio.ts';

const far=()=>new VesselDynamics({x:3500,z:-3200,heading:0});
const tick=(t:Traffic,seconds:number,p=far())=>{for(let i=0;i<Math.round(seconds*30);i++)t.update(1/30,p.state,14,.6,7000);};

test('berths reserve one ship at a time and grant FIFO access only after actual release',()=>{
 const b=new Berths();assert.ok(b.request('malo','taxi-1'));assert.equal(b.request('malo','taxi-2'),false);
 assert.equal(b.request('malo','player'),false);assert.equal(b.request('malo','taxi-2'),false);
 assert.deepEqual(b.ports.malo.queue,['taxi-2','player']);assert.equal(b.occupy('malo','taxi-2'),false);
 assert.ok(b.occupy('malo','taxi-1'));assert.equal(b.availableToPlayer('malo'),false);
 b.release('malo','taxi-1');assert.equal(b.ports.malo.reserved,'taxi-2');assert.ok(b.occupy('malo','taxi-2'));
 b.release('malo','taxi-2');assert.equal(b.ports.malo.reserved,'player');assert.ok(b.availableToPlayer('malo'));
 assert.ok(b.occupy('malo','player'));assert.ok(b.request('dinard','taxi-3'));assert.equal(b.ports.dinard.reserved,'taxi-3');
});

test('physical player occupation blocks AI until the entire berth access is cleared',()=>{
 const b=new Berths(),p=new VesselDynamics(TAXI_PORTS.dinard.berth);
 b.updatePlayer(p.state);assert.equal(b.ports.dinard.owner,'player');assert.equal(b.request('dinard','taxi-1'),false);
 p.state.z+=50;b.updatePlayer(p.state);assert.equal(b.ports.dinard.owner,'player');
 p.state.z+=20;b.updatePlayer(p.state);assert.equal(b.ports.dinard.owner,null);assert.equal(b.ports.dinard.reserved,'taxi-1');
 b.updatePlayer(far().state,'dinard');assert.equal(b.availableToPlayer('dinard'),false);
 b.updatePlayer(far().state);assert.deepEqual(b.ports.dinard.queue,[]);
});

test('three distinct taxis remain active at night and in rough weather, share traffic contacts and obey its switch',()=>{
 const t=new Traffic();assert.equal(t.taxis.agents.length,3);assert.equal(new Set(t.agents.map(a=>a.route.id)).size,27);
 t.limit=0;t.update(1/60,far().state,2,3,1200);assert.ok(t.taxis.agents.every(a=>a.active));
 const taxi=t.taxis.agents[0],player=new VesselDynamics({x:taxi.x,z:taxi.z,heading:taxi.heading});assert.equal(t.contacts(player.state).label,taxi.route.name);
 t.enabled=false;t.update(1/60,player.state,2,3,1200);assert.ok(t.agents.every(a=>!a.active));assert.equal(t.taxis.horn,undefined);
 assert.ok(t.canPlayerDock('malo'));t.enabled=true;t.update(1/60,far().state,14,.6,7000);assert.ok(t.taxis.agents.every(a=>a.active));
});

test('a player at Dinard makes taxis wait offshore and triggers one five-second horn every 25 seconds',()=>{
 const t=new Traffic(),p=new VesselDynamics(TAXI_PORTS.dinard.berth);t.limit=0;
 for(let i=0;i<60*30&&t.taxis.agents[0].taxi!.phase!=='waiting';i++)t.update(1/30,p.state,14,.6,7000);
 assert.equal(t.taxis.agents[0].taxi!.phase,'waiting');
 tick(t,29,p);assert.equal(t.taxis.horn,undefined);
 tick(t,2,p);assert.ok(t.taxis.horn);assert.equal(t.taxis.horn!.id,'taxi-1');
 tick(t,5,p);assert.equal(t.taxis.horn,undefined);
 tick(t,20,p);assert.ok(t.taxis.horn);tick(t,5,p);assert.equal(t.taxis.horn,undefined);
 assert.equal(t.taxis.berths.ports.dinard.owner,'player');assert.equal(t.taxis.agents[0].taxi!.phase,'waiting');
 for(const a of t.taxis.agents)assert.ok(Math.hypot(a.x-p.state.x,a.z-p.state.z)>60);
 p.state.x=-500;t.update(1/30,p.state,14,.6,7000);assert.equal(t.taxis.horn,undefined);assert.equal(t.taxis.agents[0].taxi!.waitingForPlayer,0);
 assert.equal(t.taxis.berths.ports.dinard.reserved,'taxi-1');
});

test('simultaneous waiting horns are serialized and every waiting taxi gets a turn',()=>{
 const t=new Traffic(),p=new VesselDynamics(TAXI_PORTS.dinard.berth);t.limit=0;
 for(const [i,a] of t.taxis.agents.entries()){a.taxi!.phase='waiting';a.taxi!.destination='dinard';a.taxi!.waitingForPlayer=29.99;a.x=-700+i*90;a.z=1390+i*90;}
 t.update(1/30,p.state,14,.6,7000);assert.equal(t.taxis.horn!.id,'taxi-1');
 tick(t,5,p);assert.equal(t.taxis.horn!.id,'taxi-2');tick(t,5,p);assert.equal(t.taxis.horn!.id,'taxi-3');
 tick(t,5,p);assert.equal(t.taxis.horn,undefined);
});

test('taxis keep rotating with all ambient traffic enabled instead of blocking each other',()=>{
 const t=new Traffic();tick(t,4200);
 for(const a of t.taxis.agents)assert.ok(a.taxi!.rotations>=2,a.route.name);
});

test('an occupied AI berth blocks player docking and becomes available after the departure manoeuvre',()=>{
 const t=new Traffic();t.limit=0;const p=far();let occupied=false,released=false;
 for(let i=0;i<1400*30;i++){
  t.update(1/30,p.state,14,.6,7000);
  if(t.taxis.berths.ports.malo.owner==='taxi-2'){
   occupied=true;assert.equal(t.canPlayerDock('malo'),false);assert.match(t.berthNotice('malo'),/Belle du Moulinet/);
   t.playerDestination='malo';
  }
  if(occupied&&t.taxis.berths.ports.malo.reserved==='player'){
   const a=t.taxis.agents[1],berth=TAXI_PORTS.malo.berth;
   assert.ok(Math.hypot(a.x-berth.x,a.z-berth.z)>230);assert.ok(t.canPlayerDock('malo'));released=true;break;
  }
 }
 assert.ok(occupied);assert.ok(released);
});

test('all taxis complete successive rotations with bounded movement, safe quays, 90-second stops and passenger transfers',()=>{
 const t=new Traffic(),p=far(),contact=new ShoreContact();t.limit=0;
 const seen=t.taxis.agents.map(()=>new Set<string>()),stops=t.taxis.agents.map(()=>[] as number[]);
 let separation=Infinity;
 for(let i=0;i<4200*30;i++){
  const before=t.taxis.agents.map(a=>({x:a.x,z:a.z,heading:a.heading,phase:a.taxi!.phase,elapsed:a.taxi!.elapsed}));
  t.update(1/30,p.state,14,.6,7000);
  for(const [j,a] of t.taxis.agents.entries()){
   seen[j].add(a.taxi!.phase);assert.ok(Math.hypot(a.x-before[j].x,a.z-before[j].z)<=TAXI_CRUISE_KNOTS*KNOT/30+1e-6);assert.ok(Math.abs(a.heading-before[j].heading)<=.1/30+1e-7);
   assert.ok(navigable(a.x,a.z,13,a.taxi!.destination));assert.ok(a.taxi!.passengers>=0&&a.taxi!.passengers<=270);
   if(before[j].phase==='stopover'&&a.taxi!.phase==='departure'){stops[j].push(before[j].elapsed);assert.ok(Math.abs(before[j].elapsed+1/30-TAXI_STOPOVER_SECONDS)<1e-6);}
   if(a.taxi!.phase==='stopover'&&before[j].phase!=='stopover'){
    const v=new VesselDynamics({x:a.x,z:a.z,heading:a.heading});const forces=contact.evaluate(v.state);assert.equal(contact.label,'');assert.ok(Math.hypot(forces.x,forces.z)<1,'moored hull intersects quay');
   }
   for(const b of t.taxis.agents)if(a!==b)separation=Math.min(separation,Math.hypot(a.x-b.x,a.z-b.z));
  }
 }
 assert.ok(separation>31,'AI hulls must never overlap');
 for(const [i,a] of t.taxis.agents.entries()){assert.ok(a.taxi!.rotations>=3);assert.ok(a.taxi!.transported>400);assert.ok(stops[i].length>=3);assert.ok(seen[i].has('crossing')&&seen[i].has('approach')&&seen[i].has('docking')&&seen[i].has('stopover')&&seen[i].has('departure'));}
});

test('each taxi crosses in about six minutes in both directions at 20 knots, including port manoeuvres',()=>{
 const p=far();
 for(let index=0;index<3;index++){
  const t=new Traffic(),a=t.taxis.agents[index],arrivals=new Set<string>();
  for(const b of t.taxis.agents)b.active=b===a;
  let departure:number|undefined,peak=0,approach=0,docking=0;
  for(let i=0;i<1800*30;i++){
   const phase=a.taxi!.phase;t.taxis.update(1/30,p.state,[],.6,7000);
   peak=Math.max(peak,a.speed);
   if(a.taxi!.phase==='approach')approach=Math.max(approach,a.speed);
   if(a.taxi!.phase==='docking')docking=Math.max(docking,a.speed);
   if(phase==='stopover'&&a.taxi!.phase==='departure')departure=i/30;
   if(phase!=='stopover'&&a.taxi!.phase==='stopover'&&departure!==undefined){
    const duration=i/30-departure;
    assert.ok(Math.abs(duration-CROSSING_SECONDS)<15,`${a.route.id} to ${a.taxi!.destination}: ${duration}s`);
    arrivals.add(a.taxi!.destination);
   }
  }
  assert.deepEqual([...arrivals].sort(),['dinard','malo']);
  assert.ok(Math.abs(peak/KNOT-20)<1e-6);assert.ok(approach>8*KNOT);assert.ok(docking>4*KNOT);
 }
});

test('passengers unload and board at each port and are counted once before the 90-second departure',()=>{
 const t=new Traffic(),a=t.taxis.agents[0],p=far(),ports=new Set<string>();
 for(const b of t.taxis.agents)b.active=b===a;
 let load=0,transported=0,checkedUnload=false,checkedBoard=false,stops=0;
 for(let i=0;i<1500*30;i++){
  const phase=a.taxi!.phase;t.taxis.update(1/30,p.state,[],.6,7000);const s=a.taxi!;
  if(phase!=='stopover'&&s.phase==='stopover'){
   ports.add(s.destination);load=s.passengers;transported=s.transported;checkedUnload=checkedBoard=false;
  }
  if(s.phase==='stopover'&&s.elapsed>12&&!checkedUnload){
   assert.ok(s.passengers<=1);assert.equal(s.transported,transported+load);checkedUnload=true;
  }
  if(s.phase==='stopover'&&s.elapsed>=30){
   assert.ok(s.passengers>=140&&s.passengers<=270);assert.equal(s.transported,transported+load);checkedBoard=true;
  }
  if(phase==='stopover'&&s.phase==='departure'){
   assert.ok(checkedUnload&&checkedBoard);assert.equal(s.transported,transported+load);stops++;
  }
 }
 assert.deepEqual([...ports].sort(),['dinard','malo']);assert.ok(stops>=3);
});

test('AI yields to the player on a collision course, without stepping through a stationary hull',()=>{
 const t=new Traffic();t.limit=0;t.update(1/60,far().state,14,.6,7000);
 const a=t.taxis.agents[2],p=new VesselDynamics({x:a.x-80,z:a.z+40,heading:0});
 a.speed=6;let minimum=Infinity,avoided=false;
 for(let i=0;i<3000;i++){t.update(1/60,p.state,14,.6,7000);minimum=Math.min(minimum,Math.hypot(a.x-p.state.x,a.z-p.state.z));avoided||=a.avoiding;}
 assert.ok(avoided);assert.ok(minimum>31);assert.equal(t.contacts(p.state).label,'');
});

test('new-session taxi spawning avoids restored player positions and new games clear berth queues',()=>{
 const t=new Traffic(),a=t.taxis.agents[0],p=new VesselDynamics({x:a.x,z:a.z,heading:0});
 t.update(1/60,p.state,14,.6,7000);assert.ok(t.taxis.agents.every(a=>Math.hypot(a.x-p.state.x,a.z-p.state.z)>180));
 t.taxis.berths.request('malo','taxi-2');t.reset();assert.equal(t.taxis.berths.ports.malo.reserved,null);assert.equal(t.elapsed,0);assert.equal(t.agents.length,27);
});

test('traffic and horn clocks remain deterministic across rendering FPS',()=>{
 const run=(fps:number)=>{const t=new Traffic(),p=new VesselDynamics(TAXI_PORTS.dinard.berth),fixed=new FixedStep(1/60,.15,8);t.limit=0;
  for(let i=0;i<fps*65;i++)fixed.advance(1/fps,dt=>t.update(dt,p.state,14,.6,7000));
  return {boats:t.taxis.agents.map(a=>[a.x,a.z,a.heading,a.taxi!.waitingForPlayer]),horn:t.taxis.horn};};
 assert.deepEqual(run(30),run(144));
});

test('AI horn respects mute, pause, master and horn volume without requiring Web Audio availability',()=>{
 const a=new MaritimeAudio(),signal={id:'taxi-1',name:'Navette',x:0,z:0};
 a.updateTrafficHorn(signal,far().state);assert.equal(a.trafficHornActive,false);
 a.apply(readAudio({enabled:true,horn:0}));a.setPaused(false);a.updateTrafficHorn(signal,far().state);assert.equal(a.trafficHornActive,false);
 a.setPaused(true);a.dispose();assert.equal(a.trafficHornActive,false);
});
