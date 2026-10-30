import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COAST_DESTINATIONS, COAST_ROUTES } from '../src/world/EmeraldCoast.ts';
import { BAY, LANDS, inside } from '../src/world/geography.ts';
import { ShoreContact } from '../src/physics/ShoreContact.ts';
import { VesselDynamics } from '../src/physics/VesselDynamics.ts';
import { depthAt } from '../src/weather/Marine.ts';

test('all excursion legs are continuous navigable water for a full hull at low tide',()=>{
  const shore=new ShoreContact(),v=new VesselDynamics();
  for(const route of COAST_ROUTES)for(let i=1;i<route.points.length;i++){
    const a=route.points[i-1],b=route.points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    for(let d=0;d<=length;d+=5){
      const x=a[0]+(b[0]-a[0])*d/length,z=a[1]+(b[1]-a[1])*d/length;
      v.reset({x,z,heading:Math.atan2(b[0]-a[0],a[1]-b[1])});
      const f=shore.evaluate(v.state);
      assert.equal(Math.hypot(f.x,f.z),0,`${route.name}: collision at ${x},${z}`);
      assert.ok(depthAt(x,z,-2.4)>2.9,`${route.name}: low water clearance`);
      assert.ok(x>BAY.minX&&x<BAY.maxX&&z>BAY.minZ&&z<BAY.maxZ);
    }
  }
  for(const d of COAST_DESTINATIONS){v.reset(d);const f=shore.evaluate(v.state);assert.equal(Math.hypot(f.x,f.z),0,d.name);}
});

test('new islands and headlands have physical shore obstacles',()=>{
  const shore=new ShoreContact();
  for(const id of ['cezembre','frehel','latte','ebihens','conchee']){
    const land=LANDS.find(l=>l.id===id)!;
    assert.ok(shore.obstacles.some(o=>o.name===land.name));
    const a=land.outline[0],b=land.outline[1];
    const v=new VesselDynamics();v.reset({x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,heading:0});
    const f=shore.evaluate(v.state);assert.ok(Math.hypot(f.x,f.z)>0,id);
  }
  assert.ok(inside(-11660,-4390,LANDS.find(l=>l.id==='frehel')!.outline));
  assert.ok(inside(-10290,-3110,LANDS.find(l=>l.id==='latte')!.outline));
});

test('sustained engine thrust cannot drive through the new island or cliffs',()=>{
  for(const pose of [{x:-1900,z:-3700,heading:0},{x:-11650,z:-5000,heading:Math.PI},{x:-9900,z:-3100,heading:-Math.PI/2}]){
    const shore=new ShoreContact(),v=new VesselDynamics();v.reset(pose);
    v.state.surge=10;v.setCommand({port:1,starboard:1});let touched=false;
    for(let i=0;i<60*90;i++){
      const f=shore.evaluate(v.state);touched ||= !!shore.label;v.step(1/60,f);
      assert.ok(!LANDS.some(l=>inside(v.state.x,v.state.z,l.outline)),`hull entered land at ${v.state.x},${v.state.z}`);
    }
    assert.ok(touched,'expected physical shore contact');
  }
});
