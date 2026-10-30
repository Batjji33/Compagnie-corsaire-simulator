import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FerryService, CROSSING_SECONDS, STOPOVER_SECONDS, validService, servicePassengers } from '../src/missions/FerryService.ts';
import type { Telemetry } from '../src/missions/Mission.ts';
import { MALO_DINARD } from '../src/missions/definitions.ts';
import { formatHour } from '../src/core/time.ts';
import { FixedStep } from '../src/core/FixedStep.ts';
import { freshData, recordResult, recordServiceResult } from '../src/saves/GameStore.ts';

const sample=(pose:Partial<Telemetry>={}):Telemetry=>({...MALO_DINARD.origin.berth,speed:0,yawRate:0,port:0,starboard:0,commandPort:0,commandStarboard:0,contact:'',damage:0,clearance:5,...pose});
const close=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-5,`${actual} ≈ ${expected}`);
function depart(s=new FerryService()){
  if(s.mission.phase==='preparation'){s.mission.board();s.update(18,sample(),100);}
  assert.ok(s.release());
  const d=s.mission.definition;
  s.update(1,sample({...d.origin.berth,x:d.origin.berth.x+100}),100);
  assert.equal(s.mission.phase,'crossing');return s;
}
function land(s:FerryService,offset=0){
  const d=s.mission.definition,at=s.timing.arrivalDue+offset;
  s.update(at-s.state.elapsed-2,sample({x:0,z:1500}),100);
  s.update(1,sample(d.destination.approach),100);
  s.update(1,sample(d.destination.berth),100);
  assert.equal(s.mission.phase,'docking');
  assert.ok(s.dock(sample(d.destination.berth)));return sample(d.destination.berth);
}

test('early arrival keeps the slot running and adds a full two-minute stopover before reversing',()=>{
  const s=depart(),leg=s.mission,t=land(s,-90),arrival=s.state.elapsed;
  close(s.slotRemaining,90);assert.equal(s.status,'En avance');close(s.waitRemaining,90+STOPOVER_SECONDS);
  s.update(30,t,100);assert.equal(s.mission,leg);assert.equal(s.transfer!.phase,'departure');assert.ok(s.canSkipWait);
  close(s.slotRemaining,60);assert.equal(s.release(),false);s.mission.release();assert.equal(s.mission.phase,'unloading');
  s.update(60,t,100);close(s.slotRemaining,CROSSING_SECONDS);assert.equal(s.status,'En escale');
  s.update(119,t,100);assert.equal(s.mission,leg);assert.equal(s.destinationPort,'dinard');
  const result=s.update(1,t,100)!;
  assert.ok(result.completed);assert.notEqual(s.mission,leg);assert.equal(s.destinationPort,'malo');assert.equal(s.mission.phase,'departure');assert.ok(s.mission.moored);
  close(s.state.elapsed,arrival+210);close(s.timing.scheduledDeparture,s.state.elapsed);close(s.timing.cumulativeDelay,0);
});

test('on-time arrival allows departure exactly two minutes after actual docking',()=>{
  const s=depart(),t=land(s),arrival=s.state.elapsed;
  close(s.delay,0);close(s.waitRemaining,120);assert.equal(s.status,'En escale');
  s.update(119.5,t,100);assert.equal(s.release(),false);assert.equal(s.state.completed,0);
  s.update(.5,t,100);assert.equal(s.state.completed,1);close(s.state.elapsed,arrival+120);assert.ok(s.release());
});

test('late and multiple missed slots preserve navigation, grow delay and start dwell at docking',()=>{
  const s=depart(),leg=s.mission;
  s.update(s.timing.arrivalDue-s.state.elapsed+10,sample({x:0,z:1500}),100);
  close(s.slotRemaining,350);close(s.delay,10);assert.equal(s.status,'En retard');assert.equal(s.mission,leg);assert.equal(s.destinationPort,'dinard');
  s.update(720,sample({x:0,z:1500,damage:.99}),100);close(s.slotRemaining,350);close(s.delay,730);assert.equal(s.mission,leg);assert.equal(s.mission.finished,false);
  const d=s.mission.definition;s.update(1,sample(d.destination.approach),100);s.update(1,sample(d.destination.berth),100);
  assert.ok(s.dock(sample(d.destination.berth)));close(s.delay,732);close(s.cumulativeDelay,732);close(s.waitRemaining,120);
  s.update(60,sample(d.destination.berth),100);close(s.delay,732);close(s.cumulativeDelay,732);
  s.update(60,sample(d.destination.berth),100);assert.equal(s.state.completed,1);close(s.cumulativeDelay,732);assert.equal(s.mission.phase,'departure');
});

test('prolonged port stays remain manual, count separately and make the following arrival late',()=>{
  const s=depart(),t=land(s);s.update(120,t,100);
  const scheduled=s.timing.scheduledDeparture;
  s.update(200,t,100);assert.equal(s.mission.phase,'departure');assert.equal(s.mission.state.released,false);assert.equal(s.status,'En escale');
  close(s.delay,200);close(s.timing.scheduledDeparture,scheduled);close(s.waitRemaining,0);assert.equal(s.canSkipWait,false);
  assert.ok(s.release());s.update(1,sample({...t,x:t.x+100}),100);
  const d=s.mission.definition;s.update(359,sample({x:0,z:1500}),100);s.update(1,sample(d.destination.approach),100);s.update(1,sample(d.destination.berth),100);
  assert.ok(s.dock(sample(d.destination.berth)));close(s.delay,202);close(s.cumulativeDelay,202);
});

test('skip requires a safe actual landing and completed transfers; it advances time without touching telemetry',()=>{
  const s=depart();assert.equal(s.skipWait(sample(),100),undefined);
  const t=land(s,-90),before=structuredClone(t);
  assert.equal(s.skipWait(t,100),undefined);
  s.update(29,t,100);assert.equal(s.skipWait(t,100),undefined);s.update(1,t,100);
  for(const bad of [{x:5000},{contact:'Quai'},{clearance:0},{speed:2}])assert.equal(s.skipWait({...t,...bad},100),undefined);
  const now=s.state.elapsed,remaining=s.waitRemaining,navigation=s.timing.navigationSeconds;
  const skipped=s.skipWait(t,100)!;
  close(skipped.seconds,remaining);assert.ok(skipped.arrival?.completed);assert.deepEqual(t,before);
  close(s.state.elapsed,now+remaining);close(s.timing.navigationSeconds,navigation);close(s.timing.skippedSeconds,remaining);
  close(s.timing.navigationSeconds+s.timing.stopoverSeconds,s.state.elapsed);close(s.hour,14+s.state.elapsed/3600);
  assert.equal(s.destinationPort,'malo');assert.equal(s.mission.state.released,false);assert.equal(s.mission.moored,true);assert.equal(s.skipWait(t,100),undefined);
  const data=freshData();recordResult(data,skipped.arrival!);recordServiceResult(data,s.finish());
  assert.equal(data.stats.completed,1);close(data.stats.seconds,s.state.elapsed);
});

test('successive early and late rotations preserve totals and safe departure after each skip',()=>{
  const s=new FerryService();let delay=0;
  for(let i=0;i<10;i++){
    depart(s);const offset=i%2?-40:80,t=land(s,offset);delay+=Math.max(0,offset);
    s.update(30,t,100);const result=s.skipWait(t,100)!;
    assert.ok(result.arrival?.completed);assert.equal(s.state.completed,i+1);assert.equal(s.destinationPort,i%2?'dinard':'malo');
    close(s.cumulativeDelay,delay);close(s.timing.arrivalDue-s.timing.scheduledDeparture,360);assert.ok(validService(s.state));
  }
  assert.equal(s.state.transported,Array.from({length:10},(_,i)=>servicePassengers(i)).reduce((a,b)=>a+b,0));
});

test('finishing during a stopover credits an unloaded crossing once without advancing time',()=>{
  const s=depart(),t=land(s,-90);s.update(30,t,85);const elapsed=s.state.elapsed;
  const result=s.finish(85),data=freshData();assert.equal(result.completed,1);assert.equal(result.transported,180);
  assert.equal(s.finish(),result);close(s.state.elapsed,elapsed);assert.ok(recordResult(data,s.mission.result!));
  assert.ok(recordServiceResult(data,result));assert.equal(recordResult(data,s.mission.result!),false);assert.equal(data.stats.passengers,180);close(data.stats.seconds,elapsed);
});

test('save/reload in early or late stopovers preserves transfers, delay, skip and the departure gate',()=>{
  for(const offset of [-60,150]){
    const s=depart(),t=land(s,offset);s.update(22,t,100);
    const state=structuredClone(s.state),leg=structuredClone(s.mission.state),r=new FerryService(state,leg);
    assert.deepEqual(r.state,state);assert.deepEqual(r.transfer,s.transfer);assert.equal(r.release(),false);assert.equal(r.skipWait(t,100),undefined);
    r.update(8,t,100);s.update(8,t,100);r.skipWait(t,100);s.skipWait(t,100);
    assert.deepEqual(r.state,s.state);assert.deepEqual(r.mission.state.elapsed,s.mission.state.elapsed);assert.equal(r.destinationPort,s.destinationPort);
  }
});

test('malformed persisted schedules are rejected and legacy service saves migrate without resetting time',()=>{
  const s=depart();s.update(100,sample({x:0,z:1500}),100);const saved=structuredClone(s.state);
  for(const bad of [{arrivalDue:NaN},{navigationSeconds:-1},{stopoverSeconds:1e12},{skippedSeconds:1e12},{cumulativeDelay:Infinity},{arrivedAt:10,nextDeparture:0},{scheduledDeparture:100}])
    assert.equal(validService({...saved,timing:{...saved.timing,...bad}}),false);
  delete saved.timing;assert.ok(validService(saved));const restored=new FerryService(saved,s.mission.state);
  close(restored.state.elapsed,s.state.elapsed);assert.equal(restored.mission.phase,'crossing');assert.ok(validService(restored.state));
});

test('simulated HH:mm wraps at midnight and is independent of rendering FPS',()=>{
  assert.equal(formatHour(0),'00:00');assert.equal(formatHour(9.5),'09:30');assert.equal(formatHour(23+59/60),'23:59');assert.equal(formatHour(24),'00:00');
  assert.equal(formatHour(14+59.9/3600),'14:00');assert.equal(formatHour(14+60/3600),'14:01');
  const run=(fps:number)=>{
    const s=depart(),fixed=new FixedStep(1/60,.25,16);
    for(let i=0;i<fps*720;i++)fixed.advance(1/fps,dt=>s.update(dt,sample({x:0,z:1500}),100));
    return {time:s.state.elapsed,hour:s.hour,delay:s.delay,remaining:s.slotRemaining};
  };
  assert.deepEqual(run(30),run(144));
});
