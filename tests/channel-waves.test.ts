import assert from 'node:assert/strict';
import test from 'node:test';
import {WaveField,relativeWavePhases,WAVE_COUNT} from '../src/weather/Waves.ts';

test('floating render origin keeps wave phases continuous at both ports and at zone boundaries',()=>{
 const water=new WaveField();water.update(50,{waves:1.5,wind:12,direction:210});
 const original=new Float32Array(WAVE_COUNT*2);water.renderPhases(0,original);
 for(const origin of [{x:0,z:0},{x:40000,z:-240000},{x:-20000,z:-52000}]){
  const relative=new Float32Array(WAVE_COUNT*2);relativeWavePhases(water,0,origin,relative);
  for(let i=0;i<WAVE_COUNT;i++){const c=water.components,j=i*4,x=70,z=-90;
   const world=c[j+2]*(c[j]*(x+origin.x)+c[j+1]*(z+origin.z))-original[i*2];
   const local=c[j+2]*(c[j]*x+c[j+1]*z)-relative[i*2];assert.ok(Math.abs(Math.sin(world)-Math.sin(local))<1e-5);
  }
 }
 const again=new Float32Array(WAVE_COUNT*2);water.renderPhases(0,again);assert.deepEqual(again,original);
});
