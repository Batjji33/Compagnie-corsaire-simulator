import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOCKS, LANDS, ROCKS, ROUTE, inside, groundHeight } from '../src/world/geography.ts';

test('crossing corridor is continuous open water, with clearance from rocks', () => {
  for(let segment=1;segment<ROUTE.length;segment++) for(let i=0;i<=100;i++) {
    const a=ROUTE[segment-1],b=ROUTE[segment],t=i/100;
    const x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
    for(const offset of [-20,0,20]) {
      assert.equal(groundHeight(x+offset,z),0,`land on corridor ${x},${z}`);
      for(const rock of ROCKS) assert.ok(Math.hypot(x+offset-rock.x,z-rock.z)>rock.radius+20);
    }
  }
});
test('both docks terminate in water and connect to the correct shore', () => {
  for(const dock of DOCKS) {
    assert.equal(groundHeight(...dock.point),0);
    assert.ok(groundHeight(...dock.land)>0);
  }
});
test('land outlines are finite, nondegenerate polygons with no crossing edges', () => {
  const cross=(a:readonly number[],b:readonly number[],c:readonly number[])=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  for(const land of LANDS) {
    assert.ok(land.outline.length>=3);
    assert.ok(land.outline.flat().every(Number.isFinite));
    for(let i=0;i<land.outline.length;i++) for(let j=i+2;j<land.outline.length;j++) {
      if(i===0&&j===land.outline.length-1) continue;
      const a=land.outline[i],b=land.outline[(i+1)%land.outline.length],c=land.outline[j],d=land.outline[(j+1)%land.outline.length];
      assert.ok(!(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0),land.id);
    }
  }
  assert.ok(inside(980,-300,LANDS[0].outline));
});
