import { DataTexture, LinearFilter, RGBAFormat, UnsignedByteType, Vector4 } from 'three';
import { BAY, LANDS, ROCKS } from './geography';
/** Signed shore-distance field shared by water colours and foam (one texture lookup). */
export function createCoastAtlas() {
  const size = BAY.atlasSize, canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const sx = size / (BAY.maxX-BAY.minX), sz = size / (BAY.maxZ-BAY.minZ);
  const dx=1/sx,dz=1/sz,diagonal=Math.hypot(dx,dz);
  ctx.fillStyle = 'white';
  for (const land of LANDS) {
    ctx.beginPath(); land.outline.forEach(([x,z],i) => { const px=(x-BAY.minX)*sx, py=(z-BAY.minZ)*sz; if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py); }); ctx.closePath(); ctx.fill();
  }
  for (const rock of ROCKS) { ctx.beginPath(); ctx.ellipse((rock.x-BAY.minX)*sx,(rock.z-BAY.minZ)*sz,rock.radius*sx,rock.radius*sz,0,0,Math.PI*2); ctx.fill(); }
  const pixels = ctx.getImageData(0,0,size,size).data;
  const distance = new Float32Array(size*size);
  for(let i=0;i<distance.length;i++) distance[i]=pixels[i*4+3] > 127 ? 0 : 10000;
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) { const i=y*size+x; if(x>0) distance[i]=Math.min(distance[i],distance[i-1]+dx); if(y>0) distance[i]=Math.min(distance[i],distance[i-size]+dz); if(x>0&&y>0) distance[i]=Math.min(distance[i],distance[i-size-1]+diagonal); }
  for(let y=size-1;y>=0;y--) for(let x=size-1;x>=0;x--) { const i=y*size+x; if(x<size-1) distance[i]=Math.min(distance[i],distance[i+1]+dx); if(y<size-1) distance[i]=Math.min(distance[i],distance[i+size]+dz); if(x<size-1&&y<size-1) distance[i]=Math.min(distance[i],distance[i+size+1]+diagonal); }
  const data = new Uint8Array(size*size*4);
  for(let i=0;i<distance.length;i++) { data[i*4]=Math.round(Math.min(1,distance[i]/BAY.shoreRange)*255); data[i*4+1]=pixels[i*4+3]; data[i*4+3]=255; }
  const texture = new DataTexture(data,size,size,RGBAFormat,UnsignedByteType); texture.minFilter=texture.magFilter=LinearFilter; texture.needsUpdate=true;
  return { texture, bounds: new Vector4(BAY.minX,BAY.minZ,BAY.maxX-BAY.minX,BAY.maxZ-BAY.minZ) };
}
