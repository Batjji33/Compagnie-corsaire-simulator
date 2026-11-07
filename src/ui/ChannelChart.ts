import { CHANNEL_LENGTH,CHANNEL_LANDS,CHANNEL_MARKS,CHANNEL_ROUTE,CHANNEL_OBSTACLES,unproject } from '../world/ChannelGeography';
import type { VesselState } from '../physics/VesselDynamics';
/** Same coordinates and land outlines as rendering/contacts; no global raster atlas. */
export class ChannelChart {
 private context:CanvasRenderingContext2D;
 radar=false;
 constructor(readonly canvas:HTMLCanvasElement){this.context=canvas.getContext('2d')!;}
 draw(state:VesselState,traffic:readonly {x:number;z:number;heading:number;active:boolean}[]=[],radarUnavailable=false):void{
  const c=this.context,w=480,h=400;this.canvas.width=w;this.canvas.height=h;
  if(this.radar&&radarUnavailable){c.fillStyle='#17191b';c.fillRect(0,0,w,h);c.fillStyle='#fff';c.font='18px sans-serif';c.fillText('Radar indisponible',24,180);c.font='14px sans-serif';c.fillText('Coordonner la veille dans Incidents et équipage.',24,210);this.canvas.setAttribute('aria-label','Radar indisponible. La carte de la Manche reste disponible.');return;}
  const extent=this.radar?4500:180000,scale=this.radar?w/(extent*2):h/340000;
  const cx=this.radar?state.x:45000,cz=this.radar?state.z:-125000;
  const px=(x:number)=>w/2+(x-cx)*scale,pz=(z:number)=>h/2+(z-cz)*scale;
  c.fillStyle='#153947';c.fillRect(0,0,w,h);c.strokeStyle='#547881';c.lineWidth=1;
  if(this.radar)for(const radius of [1500,3000,4500]){c.beginPath();c.arc(w/2,h/2,radius*scale,0,Math.PI*2);c.stroke();}
  c.fillStyle='#92a596';c.strokeStyle='#c2cfc4';
  for(const land of this.radar?CHANNEL_OBSTACLES:CHANNEL_LANDS){c.beginPath();land.outline.forEach(([x,z],i)=>i?c.lineTo(px(x),pz(z)):c.moveTo(px(x),pz(z)));c.closePath();c.fill();c.stroke();}
  c.strokeStyle='#e6c676';c.setLineDash([5,4]);c.beginPath();CHANNEL_ROUTE.forEach(([x,z],i)=>i?c.lineTo(px(x),pz(z)):c.moveTo(px(x),pz(z)));c.stroke();c.setLineDash([]);
  c.font='13px sans-serif';c.fillStyle='#fff';
  const labels:{x:number;y:number}[]=[];
  for(const mark of CHANNEL_MARKS){if(!this.radar&&mark.kind==='landmark')continue;const x=px(mark.point[0]),z=pz(mark.point[1]);if(x<0||x>w||z<0||z>h)continue;c.fillRect(x-2,z-2,4,4);let ty=z-7;const tx=Math.min(w-140,Math.max(5,x+6));while(labels.some(p=>Math.abs(p.y-ty)<15&&Math.abs(p.x-tx)<120))ty+=15;labels.push({x:tx,y:ty});c.fillText(mark.kind==='port'?(mark.name.startsWith('Portsmouth')?'Portsmouth':'Saint-Malo'):mark.name,tx,ty);}
  for(const a of traffic){if(!a.active)continue;c.save();c.translate(px(a.x),pz(a.z));c.rotate(a.heading);c.fillStyle='#f0ba70';c.beginPath();c.moveTo(0,-5);c.lineTo(3,4);c.lineTo(-3,4);c.closePath();c.fill();c.restore();}
  c.save();c.translate(px(state.x),pz(state.z));c.rotate(state.heading);c.fillStyle='#6ff2c7';c.beginPath();c.moveTo(0,-9);c.lineTo(6,7);c.lineTo(-6,7);c.closePath();c.fill();c.restore();
  c.fillStyle='#fff';c.fillText('N ↑',12,20);c.fillText(this.radar?'Radar côtier · rayon 4,5 km':`Manche · route ${(CHANNEL_LENGTH/1852).toFixed(0)} milles`,12,h-12);
  const geo=unproject(state.x,state.z);this.canvas.setAttribute('aria-label',`${this.radar?'Radar côtier':'Carte de la Manche'}, latitude ${geo.lat.toFixed(4)}, longitude ${geo.lon.toFixed(4)}. Données de jeu.`);
 }
}
