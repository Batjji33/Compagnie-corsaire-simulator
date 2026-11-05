import { BoxGeometry,BufferGeometry,CanvasTexture,Group,Mesh,MeshBasicMaterial,MeshStandardMaterial,PlaneGeometry,SRGBColorSpace,Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { FerryDynamics } from '../physics/FerryDynamics';
import { channelDepth,unproject } from '../world/ChannelGeography';
import { ChannelChart } from '../ui/ChannelChart';
export type BridgeStation='central'|'port'|'starboard';
/** Attachment contract reserved for future docking cameras; none is rendered in this phase. */
export interface DockingCameraMount {id:string;position:readonly [number,number,number];direction:readonly [number,number,number]}
export const DOCKING_CAMERA_MOUNTS:readonly DockingCameraMount[]=[{id:'stern',position:[0,13,95],direction:[0,-.2,1]},{id:'port',position:[-13,25,-68],direction:[-1,-.5,0]},{id:'starboard',position:[13,25,-68],direction:[1,-.5,0]}];
export const BRIDGE_STATIONS:Record<BridgeStation,{eye:Vector3;look:Vector3}>={
 central:{eye:new Vector3(0,2.2,1.8),look:new Vector3(0,1.5,-30)},
 port:{eye:new Vector3(-11.2,2.2,1),look:new Vector3(-24,1,-25)},
 starboard:{eye:new Vector3(11.2,2.2,1),look:new Vector3(24,1,-25)},
};
export class FerryBridge {
 readonly root=new Group();
 private displays:{canvas:HTMLCanvasElement;texture:CanvasTexture;kind:string;chart?:ChannelChart}[]=[];
 constructor(){
  this.root.name='Passerelle panoramique · trois postes';
  const sets=new Map<number,BufferGeometry[]>();
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:number,angle=0)=>{
   const g=new BoxGeometry(w,h,d);g.rotateX(angle);g.translate(x,y,z);if(!sets.has(color))sets.set(color,[]);sets.get(color)!.push(g);
  };
  box(0,-.12,0,27,.24,9,0x545e60);box(0,4,0,27,.18,9,0xc5cbca);
  box(0,.35,-4,27,.7,.25,0x9da6a4);box(0,3.7,-4,27,.25,.3,0xb6bebc);
  for(let x=-13;x<=13;x+=2.6)box(x,2,-4,.1,3.5,.16,0x999f9b,-.12);
  for(const side of [-1,1]){box(side*13.4,.4,0,.15,.8,8.5,0xaeb5b4);for(const z of [-3,0,3])box(side*13.4,2,z,.1,3.4,.1,0xaeb5b4);box(side*13.1,.65,2.5,.4,1.3,3,0x263239);}
  // Broad sloped dark console, paired chairs and independent wing consoles inspired by reference photograph.
  box(0,.65,-1.7,11,1.3,1.7,0x303b42);box(0,1.3,-2.15,11,.16,1.45,0x263239,-.3);
  for(const side of [-1,1]){
   box(side*1.6,.55,.5,.16,1.1,.16,0xa3adae);box(side*1.6,1.1,.5,.7,.2,.7,0x202b31);box(side*1.6,1.65,.78,.7,1,.15,0x202b31);
   box(side*2.15,1.15,-.25,.45,.12,1.5,0x333e44);
   box(side*11.2,.65,-1.3,2.7,1.3,1.4,0x303b42);box(side*11.2,1.32,-1.45,2.8,.15,1.5,0x263239,-.3);
  }
  for(const center of [0,-11.2,11.2]){
   for(const dx of [-.25,.25]){box(center+dx,1.45,-1.1,.05,.3,.05,0xaaaaa5);box(center+dx,1.6,-1.1,.13,.08,.13,0x202b31);}
   for(let i=0;i<7;i++)box(center-.65+i*.19,1.4,-.85,.09,.04,.09,i===6?0x914a3b:0x899597);
  }
  for(const [color,geometries] of sets){const g=mergeGeometries(geometries)!;geometries.forEach(g=>g.dispose());this.root.add(new Mesh(g,new MeshStandardMaterial({color,roughness:.8})));}
  for(const [x,kind] of [[-3.6,'radar'],[-1.2,'navigation'],[1.2,'energy'],[3.6,'map'],[-11.2,'navigation'],[11.2,'navigation']] as const){
   const canvas=document.createElement('canvas');canvas.width=kind==='radar'||kind==='map'?480:512;canvas.height=kind==='radar'||kind==='map'?400:256;const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;
   const mesh=new Mesh(new PlaneGeometry(Math.abs(x)>10?1.8:2.1,.95),new MeshBasicMaterial({map:texture}));mesh.position.set(x,1.7,-2.5);mesh.rotation.x=-.35;this.root.add(mesh);
   const chart=kind==='radar'||kind==='map'?new ChannelChart(canvas):undefined;if(chart)chart.radar=kind==='radar';this.displays.push({canvas,texture,kind,chart});
  }
 }
 update(d:FerryDynamics,traffic:readonly {x:number;z:number;heading:number;active:boolean}[]=[]):void{
  const s=d.state,p=d.plant,geo=unproject(s.x,s.z),heading=((s.heading*180/Math.PI)%360+360)%360;
  for(const display of this.displays){if(display.chart)display.chart.draw(s,traffic);else{
   const c=display.canvas.getContext('2d')!;c.fillStyle='#10262c';c.fillRect(0,0,512,256);c.fillStyle='#bde5d6';c.font='27px sans-serif';
   const lines=display.kind==='energy'?['ÉNERGIE · '+p.mode.toUpperCase(),`BAT ${(p.soc*100).toFixed(1)} % · ${(p.deliveredKW/1000).toFixed(2)} MW`,`GNL ${p.fuelKgHour.toFixed(0)} kg/h`,`B ${Math.round(s.port*100)} % / T ${Math.round(s.starboard*100)} %`]:[
    `CAP ${heading.toFixed(1)}° · SOG ${(d.groundSpeed*3600/1852).toFixed(1)} nd`,`${geo.lat.toFixed(4)} N  ${Math.abs(geo.lon).toFixed(4)} O`,
    `Fond jeu ${channelDepth(s.x,s.z)} m · UKC ${(channelDepth(s.x,s.z)-6.6).toFixed(1)} m`,`Barre ${(s.rudder*180/Math.PI).toFixed(1)}° · ROT ${(s.yawRate*180/Math.PI*60).toFixed(1)}°/min`];
   lines.forEach((line,i)=>c.fillText(line,14,45+i*53,484));
  }display.texture.needsUpdate=true;}
 }
 dispose():void{this.root.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});this.displays.forEach(d=>d.texture.dispose());this.root.removeFromParent();}
}
