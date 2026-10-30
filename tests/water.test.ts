import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WaveField, WAVE_COUNT } from '../src/weather/Waves.ts';
import { Marine, SEA } from '../src/weather/Marine.ts';
import { WakeTrail, WAKE_CAPACITY, WAKE_LIFETIME } from '../src/ships/WakeTrail.ts';
import { VesselDynamics } from '../src/physics/VesselDynamics.ts';
import { BOAT } from '../src/ships/parameters.ts';
import { FixedStep } from '../src/core/FixedStep.ts';
import { readAudio, MaritimeAudio } from '../src/audio/MaritimeAudio.ts';
import { readMarine } from '../src/saves/GameStore.ts';

test('calm, rough and storm seas have real crests/troughs and weather-driven dispersion',()=>{
  const ranges:number[]=[];
  for(const sea of ['calme','agitee','tempete'] as const){
    const field=new WaveField(),[wind,waves]=SEA[sea];field.update(0,{waves,wind,direction:250});
    const heights:number[]=[];for(let x=-180;x<180;x+=3)for(let z=-60;z<60;z+=3)heights.push(field.height(x,z));
    ranges.push(Math.max(...heights)-Math.min(...heights));
    assert.ok(Math.min(...heights)<0&&Math.max(...heights)>0);
    assert.equal(field.components.length,WAVE_COUNT*4);
  }
  assert.ok(ranges[0]<.25&&ranges[1]>1.8&&ranges[2]>4.5);
  const calm=new WaveField(),storm=new WaveField();calm.update(0,{waves:.15,wind:2,direction:0});storm.update(0,{waves:5.2,wind:42,direction:0});
  assert.ok(storm.components[2]<calm.components[2]);
  const [x,z]=[storm.components[0],storm.components[1]];storm.update(0,{waves:5.2,wind:42,direction:90});
  assert.ok(Math.abs(x*storm.components[0]+z*storm.components[1])<1e-6);
});

test('CPU water height inverts the horizontal Gerstner displacement, including deep storm crests',()=>{
  const field=new WaveField();field.update(0,{waves:5.2,wind:42,direction:200});
  for(let x=-100;x<100;x+=4)for(let z=-30;z<30;z+=7){
    let px=x,pz=z,y=0;
    for(let i=0;i<WAVE_COUNT;i++){
      const c=field.components,j=i*4,phase=c[j+2]*(c[j]*x+c[j+1]*z)-field.phases[i*2],horizontal=c[j+3]*field.phases[i*2+1]*Math.cos(phase);
      px+=c[j]*horizontal;pz+=c[j+1]*horizontal;y+=c[j+3]*Math.sin(phase);
    }
    assert.ok(Math.abs(field.height(px,pz)-y)<.015);
  }
});

test('hull float follows water, has signed pitch/roll and is continuous through weather changes',()=>{
  const field=new WaveField(),weather={waves:5.2,wind:42,direction:250},pose={heave:0,pitch:0,roll:0};field.update(0,weather);
  let min=Infinity,max=-Infinity,pitch=0,roll=0;
  for(let i=0;i<600;i++){
    field.update(1/60,weather);field.hull(0,0,0,BOAT.length,BOAT.beam,0,pose);
    assert.ok(Object.values(pose).every(Number.isFinite));
    min=Math.min(min,pose.heave);max=Math.max(max,pose.heave);pitch=Math.max(pitch,Math.abs(pose.pitch));roll=Math.max(roll,Math.abs(pose.roll));
    const target=field.height(0,0);assert.ok(Math.abs(pose.heave-target)<.65);
    const before=field.height(0,0);field.update(0,weather);assert.ok(Math.abs(field.height(0,0)-before)<1e-8);
  }
  assert.ok(max-min>1.5&&pitch>.04&&roll>.04);
  const m=new Marine();m.evolving=false;m.sea='tempete';let previous=field.height(50,80);
  field.update(0,m);previous=field.height(50,80);
  for(let i=0;i<600;i++){m.update(1/60);field.update(1/60,m);const next=field.height(50,80);assert.ok(Math.abs(next-previous)<.15);previous=next;}
  assert.equal(readMarine({sea:'tempete'}).sea,'tempete');
});

test('wake records actual turns in world space, remains bounded and fades after stopping',()=>{
  const wake=new WakeTrail(),boat=new VesselDynamics({x:0,z:0,heading:0});boat.state.surge=8;boat.state.port=boat.state.starboard=1;
  for(let i=0;i<60*45;i++){
    const s=boat.state;s.heading=i/60*.06;s.x+=Math.sin(s.heading)*8/60;s.z-=Math.cos(s.heading)*8/60;
    wake.update(1/60,i/60,s);assert.ok(wake.count<=WAKE_CAPACITY);
  }
  assert.ok(wake.count>100);const first={...wake.at(0)},old={...wake.at(wake.count-1)};
  assert.ok(Math.abs(first.dx-old.dx)>.1);assert.ok(Math.hypot(first.x-old.x,first.z-old.z)>40);
  boat.state.surge=0;boat.state.port=boat.state.starboard=0;
  wake.update(1/60,45,boat.state);assert.deepEqual(wake.at(0),first);
  wake.update(1/60,46+WAKE_LIFETIME,boat.state);assert.equal(wake.count,0);
  boat.state.surge=8;wake.update(.2,80,boat.state);boat.state.x+=500;wake.update(.01,80.01,boat.state);assert.equal(wake.count,0);
});

test('idle/moored boats do not emit trails, astern emits behind the direction of motion',()=>{
  const wake=new WakeTrail(),boat=new VesselDynamics({x:0,z:0,heading:0});wake.update(5,5,boat.state);assert.equal(wake.count,0);
  boat.state.surge=3;wake.update(5,10,boat.state,true);assert.equal(wake.count,0);
  boat.state.surge=-3;wake.update(.2,10.2,boat.state);assert.equal(wake.count,1);assert.ok(wake.at(0).z<0&&wake.at(0).dz>0);
});

test('wave phases and wake history are identical at 30 and 144 rendering FPS',()=>{
  const run=(fps:number)=>{
    const m=new Marine(),field=new WaveField(),wake=new WakeTrail(),boat=new VesselDynamics({x:0,z:0,heading:0}),clock=new FixedStep(1/60,.15,8);boat.setCommand({port:1,starboard:1});
    for(let i=0;i<fps*12;i++)clock.advance(1/fps,dt=>{m.update(dt);field.update(dt,m);boat.step(dt);wake.update(dt,m.time,boat.state);});
    return {height:field.height(12,34),phase:[...field.phases],wake:Array.from({length:wake.count},(_,i)=>({...wake.at(i)}))};
  };
  assert.deepEqual(run(30),run(144));
});

test('old audio settings gain a bounded horn volume and muted/paused audio cannot start the horn',()=>{
  assert.equal(readAudio({enabled:true,engines:.2}).horn,.7);assert.equal(readAudio({horn:9}).horn,1);assert.equal(readAudio({horn:-2}).horn,0);
  const audio=new MaritimeAudio();assert.equal(audio.startHorn(),false);audio.apply({...readAudio({enabled:true}),horn:0});assert.equal(audio.startHorn(),false);audio.dispose();assert.equal(audio.hornActive,false);
});
