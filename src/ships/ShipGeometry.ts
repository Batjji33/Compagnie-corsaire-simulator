import { BufferGeometry, Float32BufferAttribute } from 'three';
/** Closed loft with outward faces, shared by hull and tapered cabin volumes. */
export function loft(stations: readonly {z:number;width:number;bottom:number;top:number}[]):BufferGeometry {
  const positions:number[]=[],indices:number[]=[];
  for(const s of stations) positions.push(-s.width*.42,s.bottom,s.z,s.width*.42,s.bottom,s.z,s.width/2,s.top,s.z,-s.width/2,s.top,s.z);
  for(let i=0;i<stations.length-1;i++)for(let side=0;side<4;side++) {
    const a=i*4+side,b=i*4+(side+1)%4,c=(i+1)*4+side,d=(i+1)*4+(side+1)%4;
    indices.push(a,b,c,b,d,c);
  }
  indices.push(0,2,1,0,3,2);
  const last=(stations.length-1)*4;indices.push(last,last+1,last+2,last,last+2,last+3);
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
