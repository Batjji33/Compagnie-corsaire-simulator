import { LANDS, inside } from './geography.ts';
import type { Point } from './geography.ts';
import { ShoreContact } from '../physics/ShoreContact.ts';
import { REGIONAL_COAST } from './channelCoast.ts';

/** Equirectangular regional projection; WGS84 degrees, metres, east +X / south +Z.
 * Authored Corsaire bay is retained verbatim. Anchor is approximate, not surveyed. */
const R=6371008.8, RAD=Math.PI/180, LAT=49.7, ANCHOR={lat:48.645,lon:-2.025,x:920,z:245};
export function project(lon:number,lat:number):Point {return [ANCHOR.x+R*RAD*(lon-ANCHOR.lon)*Math.cos(LAT*RAD),ANCHOR.z-R*RAD*(lat-ANCHOR.lat)];}
export function unproject(x:number,z:number):{lon:number;lat:number} {return {lon:ANCHOR.lon+(x-ANCHOR.x)/(R*RAD*Math.cos(LAT*RAD)),lat:ANCHOR.lat-(z-ANCHOR.z)/(R*RAD)};}
export interface ChannelLand {id:string;name:string;outline:readonly Point[];height:number;port?:boolean}
const land=(id:string,name:string,outline:readonly Point[],height=12,port=false):ChannelLand=>({id,name,outline,height,port});
const geo=(id:string,name:string,coords:readonly Point[],height=12):ChannelLand=>land(id,name,coords.map(([lon,lat])=>project(lon,lat)),height,true);
export const CHANNEL_LANDS:readonly ChannelLand[]=[
 ...REGIONAL_COAST.map((ring,i)=>land(`regional-${i}`,'Côte de la Manche',ring.map(([lon,lat])=>project(lon,lat)),35)),
 // Harbour-scale interpretation of the official port limits plan; not hydrographic survey data.
 geo('gosport','Gosport · Haslar',[
 [-1.3,50.78],[-1.22,50.78],[-1.17,50.785],[-1.147,50.777],[-1.126,50.779],[-1.1155,50.785],[-1.116,50.790],[-1.121,50.795],[-1.121,50.802],[-1.129,50.809],[-1.133,50.817],[-1.15,50.825],[-1.155,50.838],[-1.148,50.85],[-1.14,50.865],[-1.12,50.88],[-1.10,50.887],[-1.08,50.881],[-1.083,50.87],[-1.095,50.855],[-1.093,50.848],[-1.078,50.84],[-1.066,50.839],[-1.05,50.84],[-1.04,50.86],[-1.00,50.88],[-.95,50.89],[-.95,50.90],[-1.3,50.90]],14),
 geo('portsea','Portsea · base navale · terminal international',[
 [-1.1068,50.7852],[-1.099,50.7805],[-1.086,50.778],[-1.07,50.777],[-1.045,50.781],[-.95,50.79],[-.95,50.89],[-1.00,50.88],[-1.04,50.86],[-1.05,50.84],[-1.066,50.839],[-1.077,50.836],[-1.083,50.832],[-1.086,50.826],[-1.088,50.823],[-1.087,50.819],[-1.092,50.817],[-1.092,50.813],[-1.097,50.811],[-1.096,50.807],[-1.103,50.805],[-1.104,50.802],[-1.109,50.800],[-1.108,50.796],[-1.105,50.794],[-1.107,50.790]],8),
 ...Array.from({length:3},(_,i)=>geo('portsmouth-pier-'+i,'Portsmouth · quai ferry',[
 [-1.0945+i*.002,50.8186+i*.0016],[-1.087,50.8186+i*.0016],[-1.087,50.8189+i*.0016],[-1.0945+i*.002,50.8189+i*.0016]],8)),
 // Naye is an overlay on the existing authored layout, never a replacement for Corsaire geometry.
 land('naye-apron','Terminal ferry du Naye',[[1130,1030],[1410,1030],[1410,750],[1230,750],[1130,830]],5,true),
 land('naye-pier','Quai ferry du Naye',[[1080,1010],[1130,1010],[1130,650],[1080,650]],5,true),
];
export const CHANNEL_OBSTACLES=[...LANDS.map(l=>({id:l.id,name:l.name,outline:l.outline,height:l.height})),...CHANNEL_LANDS];
export interface ChannelMark {name:string;point:Point;kind:'port'|'island'|'landmark'}
export const CHANNEL_MARKS:readonly ChannelMark[]=[
 {name:'Saint-Malo · Naye',point:[1050,840],kind:'port'},
 {name:'Portsmouth International Port',point:project(-1.089,50.817),kind:'port'},
 {name:'Jersey',point:project(-2.14,49.215),kind:'island'},
 {name:'Guernesey',point:project(-2.58,49.45),kind:'island'},
 {name:'Sercq',point:project(-2.36,49.43),kind:'island'},
 {name:'Aurigny',point:project(-2.20,49.715),kind:'island'},
 {name:'Île de Wight',point:project(-1.28,50.66),kind:'island'},
 {name:'Cotentin',point:project(-1.85,49.65),kind:'landmark'},
 {name:'Spinnaker Tower',point:project(-1.1080,50.7957),kind:'landmark'},
 {name:'Round Tower',point:project(-1.109,50.790),kind:'landmark'},
];
export const CHANNEL_BERTHS=[
 {id:'naye',name:'Naye · poste de jeu',point:[940,760] as Point,heading:0,length:240,width:45,depth:9},
 {id:'portsmouth',name:'Portsmouth · poste de jeu',point:project(-1.0935,50.818),heading:Math.PI/2,length:240,width:45,depth:10},
] as const;
/** Route of reconnaissance, not a sailing instruction. Islands have no mandatory stop. */
export const CHANNEL_ROUTE:readonly Point[]=[
 [940,760],[940,610],[860,535],[650,550],[350,610],[30,700],[-200,780],[-430,700],[-450,250],[-900,-200],[-1050,-1600],[-1100,-3200],[-1000,-5500],
 project(-2.20,48.77),project(-2.32,49.12),project(-2.31,49.29),project(-2.18,49.49),project(-2.02,49.81),
 project(-.88,50.60),project(-.90,50.68),project(-1.04,50.75),project(-1.095,50.778),
 project(-1.111,50.787),project(-1.112,50.793),project(-1.115,50.798),project(-1.114,50.804),
 project(-1.109,50.809),project(-1.101,50.814),project(-1.098,50.818),CHANNEL_BERTHS[1].point,
];
export const ROUTE_DISTANCES=[0];
for(let i=1;i<CHANNEL_ROUTE.length;i++)ROUTE_DISTANCES.push(ROUTE_DISTANCES[i-1]+Math.hypot(CHANNEL_ROUTE[i][0]-CHANNEL_ROUTE[i-1][0],CHANNEL_ROUTE[i][1]-CHANNEL_ROUTE[i-1][1]));
export const CHANNEL_LENGTH=ROUTE_DISTANCES.at(-1)!;
export function routePose(distance:number):{x:number;z:number;heading:number;leg:number}{
 const d=Math.max(0,Math.min(CHANNEL_LENGTH,distance));let leg=0;
 while(leg<CHANNEL_ROUTE.length-2&&ROUTE_DISTANCES[leg+1]<d)leg++;
 const a=CHANNEL_ROUTE[leg],b=CHANNEL_ROUTE[leg+1],t=(d-ROUTE_DISTANCES[leg])/(ROUTE_DISTANCES[leg+1]-ROUTE_DISTANCES[leg]);
 return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,heading:Math.atan2(b[0]-a[0],a[1]-b[1]),leg};
}
export function edgeDistance(x:number,z:number,outline:readonly Point[]):number {
 let distance=Infinity;
 for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));distance=Math.min(distance,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));}return distance;
}
const bounds=CHANNEL_OBSTACLES.map(l=>({land:l,minX:Math.min(...l.outline.map(p=>p[0])),maxX:Math.max(...l.outline.map(p=>p[0])),minZ:Math.min(...l.outline.map(p=>p[1])),maxZ:Math.max(...l.outline.map(p=>p[1]))}));
const legacyContact=new ShoreContact();
export function channelContact(x:number,z:number,margin=0):string|undefined{
 if(x>-15000&&x<5000&&z>-7000&&z<5000){const hit=legacyContact.nearby(x,z,margin);if(hit)return 'Obstacle Corsaire : '+hit;}
 for(const b of bounds){if(x+margin<b.minX||x-margin>b.maxX||z+margin<b.minZ||z-margin>b.maxZ)continue;if(inside(x,z,b.land.outline)||edgeDistance(x,z,b.land.outline)<=margin)return b.land.name;}
}
export function ferryContact(x:number,z:number,heading:number):string|undefined {
 // Capsule samples spaced closer than the beam, covering the full 194.7 m length.
 for(let f=-83.45;f<=83.46;f+=8.345){const hit=channelContact(x+Math.sin(heading)*f,z-Math.cos(heading)*f,13.9);if(hit)return hit;}
}
export function navigationZone(x:number,z:number):'port'|'approach'|'offshore'{
 const distance=Math.min(...CHANNEL_BERTHS.map(b=>Math.hypot(x-b.point[0],z-b.point[1])));
 return distance<6000?'port':distance<18000?'approach':'offshore';
}
/** Conservative game depth, no bathymetric survey or tide corrections. */
export function channelDepth(x:number,z:number):number {return channelContact(x,z)?0:navigationZone(x,z)==='offshore'?60:12;}

/** Nearest point along the authored route, usable in either direction. */
export function routeProgress(x:number,z:number):number {
 let best=Infinity,progress=0;
 for(let i=1;i<CHANNEL_ROUTE.length;i++){const a=CHANNEL_ROUTE[i-1],b=CHANNEL_ROUTE[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(length*length)));const distance=Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);if(distance<best){best=distance;progress=ROUTE_DISTANCES[i-1]+length*t;}}
 return progress;
}
