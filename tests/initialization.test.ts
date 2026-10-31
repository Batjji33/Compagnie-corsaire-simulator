import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformWithOxc } from 'vite';
import { BOAT, SAINT_MALO } from '../src/ships/parameters.ts';

test('vessel initializes when class fields are lowered for older browsers',async()=>{
  // Native TypeScript execution preserves class fields and missed the production crash.
  const file=new URL('../src/physics/VesselDynamics.ts',import.meta.url);
  const parameters=new URL('../src/ships/parameters.ts',import.meta.url).href;
  const source=readFileSync(file,'utf8').replaceAll("'../ships/parameters.ts'",JSON.stringify(parameters));
  const {code}=await transformWithOxc(source,'VesselDynamics.ts',{target:'safari15',assumptions:{setPublicClassFields:true}});
  const {VesselDynamics}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  const boat=new VesselDynamics();
  assert.equal(boat.state.x,BOAT.spawn.x);assert.equal(boat.state.z,BOAT.spawn.z);
  assert.equal(boat.state.heading,BOAT.spawn.heading);
  const pose={x:20,z:-40,heading:1};const placed=new VesselDynamics(pose);
  assert.equal(placed.state.x,20);assert.equal(placed.state.z,-40);
  boat.parameters={...SAINT_MALO,spawn:pose};boat.reset();
  assert.equal(boat.state.x,20);assert.equal(boat.state.z,-40);
});
