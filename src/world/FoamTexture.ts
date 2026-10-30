import { DataTexture, RGBAFormat, RepeatWrapping, LinearFilter, LinearMipmapLinearFilter } from 'three';

/** Small seamless, seeded value-noise texture shared by whitecaps, propwash and wake. */
export function createFoamTexture():DataTexture {
  const size=128,data=new Uint8Array(size*size*4);
  const hash=(x:number,z:number,period:number)=>{let n=Math.imul((x%period+period)%period,374761393)^Math.imul((z%period+period)%period,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
  const noise=(x:number,z:number,period:number)=>{
    const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,sx=fx*fx*(3-2*fx),sz=fz*fz*(3-2*fz);
    const a=hash(ix,iz,period),b=hash(ix+1,iz,period),c=hash(ix,iz+1,period),d=hash(ix+1,iz+1,period);
    return (a+(b-a)*sx)*(1-sz)+(c+(d-c)*sx)*sz;
  };
  for(let z=0;z<size;z++)for(let x=0;x<size;x++){
    let value=0,weight=0;
    for(const [period,amplitude] of [[4,.45],[8,.28],[16,.17],[32,.1]]){value+=noise(x/size*period,z/size*period,period)*amplitude;weight+=amplitude;}
    const i=(z*size+x)*4;data[i]=Math.round(value/weight*255);data[i+1]=Math.round(noise(x*.5,z*.5,64)*255);data[i+2]=data[i];data[i+3]=255;
  }
  const texture=new DataTexture(data,size,size,RGBAFormat);texture.wrapS=texture.wrapT=RepeatWrapping;texture.magFilter=LinearFilter;texture.minFilter=LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
