import { BufferGeometry, Group, InstancedMesh, Mesh, Shape, ShapeGeometry, Vector3 } from 'three';
import { Batch } from './Batch';
import { BayEnvironment } from './BayEnvironment';
import { createMaterials } from './Materials';
import { CHANNEL_LANDS, project } from './ChannelGeography';
import type { ChannelLand } from './ChannelGeography';
import { inside, random } from './geography';
import type {Quality} from '../config';
import type { Point } from './geography';

export const LOAD_DISTANCE=42000,UNLOAD_DISTANCE=52000,CHANNEL_FOG=24000;
const boundsCache=new WeakMap<object,{minX:number;maxX:number;minZ:number;maxZ:number}>();
export function boundsDistance(x:number,z:number,outline:readonly Point[]):number{
 let b=boundsCache.get(outline);if(!b){b={minX:Math.min(...outline.map(p=>p[0])),maxX:Math.max(...outline.map(p=>p[0])),minZ:Math.min(...outline.map(p=>p[1])),maxZ:Math.max(...outline.map(p=>p[1]))};boundsCache.set(outline,b);}const {minX,maxX,minZ,maxZ}=b;
 return Math.hypot(Math.max(minX-x,0,x-maxX),Math.max(minZ-z,0,z-maxZ));
}
/** Lazy geometry allocation outside the fog, hysteresis, local vertex coordinates. */
export class ChannelEnvironment {
 readonly root=new Group();
 private quality:Quality='low';
 setQuality(quality:Quality):void{this.quality=quality;this.bay?.setQuality(quality);}
 private palette=createMaterials();
 private loaded=new Map<string,Group>();
 private bay:BayEnvironment|undefined;
 private camera=new Vector3();
 private ports=new Group();
 constructor(){this.root.add(this.ports);this.buildPorts();}
 update(x:number,z:number,time:number):void {
  let budget=1;
  for(const land of CHANNEL_LANDS){const d=boundsDistance(x,z,land.outline),group=this.loaded.get(land.id);
   if(d<LOAD_DISTANCE&&!group&&budget-->0){const made=this.terrain(land);this.loaded.set(land.id,made);this.root.add(made);}
   if(d>UNLOAD_DISTANCE&&group){this.free(group);this.loaded.delete(land.id);}
  }
  const distance=Math.hypot(x,z);
  if(distance<30000&&!this.bay){this.bay=new BayEnvironment(this.quality);this.root.add(this.bay.root);}
  if(distance>40000&&this.bay){this.bay.root.removeFromParent();this.bay.dispose();this.bay=undefined;}
  this.camera.set(x,120,z);this.bay?.update(this.camera,time,CHANNEL_FOG);
 }
 private terrain(land:ChannelLand):Group{
  const group=new Group(),[ox,oz]=land.outline[0];group.position.set(ox,0,oz);group.name=land.name;
  const shape=new Shape();land.outline.forEach(([x,z],i)=>i?shape.lineTo(x-ox,-z+oz):shape.moveTo(x-ox,-z+oz));shape.closePath();
  const top=new ShapeGeometry(shape);top.rotateX(-Math.PI/2);top.translate(0,land.height,0);
  group.add(new Mesh(top,this.palette.materials[land.port?'town':'grass']));
  // Full-height coast walls share the same outline as contacts and map.
  const batch=new Batch();
  for(let i=0;i<land.outline.length;i++){const a=land.outline[i],b=land.outline[(i+1)%land.outline.length],dx=b[0]-a[0],dz=b[1]-a[1];
   batch.add('box',land.port?'stone':'cliff',(a[0]+b[0])/2-ox,land.height/2-2,(a[1]+b[1])/2-oz,1,land.height+4,Math.hypot(dx,dz),Math.atan2(dx,dz));}
  group.add(batch.build(this.palette.materials));return group;
 }
 private buildPorts():void{
  const north=new Batch(),south=new Batch(),anchor=project(-1.10,50.80);
  const at=(lon:number,lat:number)=>{const p=project(lon,lat);return [p[0]-anchor[0],p[1]-anchor[1]] as Point;};
  // Portsmouth: sail-shaped Spinnaker, Round Tower, historic dockyard, ferry terminal and yards.
  const [sx,sz]=at(-1.108,50.7957);
  north.add('cylinder','white',sx,85,sz,10,170,10);
  for(let i=0;i<16;i++){const y=i*9+12,w=Math.sin(i/16*Math.PI)*36;north.add('box','white',sx+w/2,y,sz,w+3,2,5);}
  for(const y of [100,105,110])north.add('box','dark',sx+12,y,sz,28,4,18);
  const [rx,rz]=at(-1.109,50.790);north.add('cylinder','stone',rx,9,rz,25,18,25);
  const [tx,tz]=at(-1.083,50.816);north.add('box','facade',tx,15,tz,170,15,62);north.add('roof','roof',tx,22.5,tz,175,8,68);
  // Three shore-side linkspan landmarks; no operational berth claim.
  for(let i=0;i<3;i++){const [x,z]=at(-1.0925+i*.002,50.81865+i*.0016);north.add('box','town',x,8,z,90,4,24);north.add('box','white',x+30,12,z,5,14,5);}
  for(let i=0;i<6;i++){const [x,z]=at(-1.098+i*.00065,50.806+i*.0013);north.add('box','facade',x,14,z,48,15,95);north.add('roof','roof',x,21.5,z,50,7,98);}
  for(let i=0;i<10;i++){const [x,z]=at(-1.08+(i%5)*.0008,50.820+Math.floor(i/5)*.001);north.add('box','dark',x,12,z,25,8,10);}
  for(let i=0;i<18;i++){const [x,z]=at(-1.084+i*.0002,50.817);north.add('box','white',x,8.15,z,1,.12,85);}
  for(const [lon,lat] of [[-1.086,50.811],[-1.088,50.815]]){const [x,z]=at(lon,lat);north.add('box','dark',x,32,z,5,50,5);north.add('box','red',x-25,55,z,60,4,5);}
  // Repeated urban blocks communicate Portsea/Gosport density without unique draw calls.
  const rng=random(503),urban=CHANNEL_LANDS.filter(l=>l.id==='portsea'||l.id==='gosport');
  for(let lon=-1.145;lon< -1.06;lon+=.00155)for(let lat=50.782;lat<50.833;lat+=.00105){
    const point=project(lon,lat),district=urban.find(l=>inside(point[0],point[1],l.outline));if(!district)continue;
    // All four corners must be ashore. Keep port yards and the dockyard legible.
    if(lon> -1.097&&lon< -1.075&&lat>50.802)continue;
    if(![[-35,-30],[35,-30],[35,30],[-35,30]].every(([x,z])=>inside(point[0]+x,point[1]+z,district.outline)))continue;
    const x=point[0]-anchor[0],z=point[1]-anchor[1],height=7+rng()*13,floor=district.height;
    north.add('box','facade',x,floor+height/2,z,55,height,48,0,[0xa89d90,0xc5b8a3,0xd4ccc0][Math.floor(rng()*3)]);
    north.add('roof','roof',x,floor+height,z,58,5,51);
  }
  const n=north.build(this.palette.materials);n.position.set(anchor[0],0,anchor[1]);n.name='Portsmouth · infrastructures';this.ports.add(n);
  south.add('box','facade',1280,12,900,125,14,55);south.add('roof','roof',1280,19,900,130,6,60);
  for(let i=0;i<12;i++)south.add('box','white',1180+i*14,5.15,840,1,.15,120);
  for(const z of [705,945]){south.add('box','dark',1100,5.5,z,42,1,20);south.add('box','white',1120,12,z,4,18,4);}
  const s=south.build(this.palette.materials);s.name='Naye · terminal et deux rampes';this.ports.add(s);
  // Harbour access markers are deliberately game marks, not copied navigation buoy positions.
  const marks=new Batch();for(const [lon,lat] of [[-1.095,50.778],[-1.111,50.787],[-1.112,50.793],[-1.114,50.804]]){
   const [x,z]=at(lon,lat);for(const side of [-1,1]){marks.add('cylinder',side<0?'red':'green',x+side*90,3,z,5,6,5);marks.add('cone',side<0?'red':'green',x+side*90,8,z,3,3,3);}}
  const b=marks.build(this.palette.materials);b.position.copy(n.position);this.ports.add(b);
  const maloMarks=new Batch();for(const [x,z] of [[650,550],[-1050,-1600],[-1100,-3200],[-1000,-5500]])for(const side of [-1,1])maloMarks.add('cylinder',side<0?'red':'green',x+side*130,3,z,5,6,5);this.ports.add(maloMarks.build(this.palette.materials));
 }
 private free(group:Group):void{const geometries=new Set<BufferGeometry>();group.traverse(o=>{if(o instanceof Mesh)geometries.add(o.geometry);if(o instanceof InstancedMesh)o.dispose();});geometries.forEach(g=>g.dispose());group.removeFromParent();}
 get loadedCount():number{return this.loaded.size;}
 dispose():void{this.bay?.dispose();for(const g of this.loaded.values())this.free(g);this.free(this.ports);this.palette.dispose();this.root.removeFromParent();}
}
