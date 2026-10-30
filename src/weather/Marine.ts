import { BOAT, KNOT, clamp } from '../ships/parameters.ts';
import { ROCKS } from '../world/geography.ts';
import type { VesselState, ExternalForce } from '../physics/VesselDynamics.ts';
export const SEA = { calme: [2, .15, 10000], belle: [10, .6, 7000], agitee: [24, 2.2, 2800], tempete: [42, 5.2, 1500] } as const;
export const SEA_LABELS={calme:'Calme',belle:'Belle mer',agitee:'Mer agitée',tempete:'Tempête'} as const;
export type SeaState = keyof typeof SEA;
export const SHOALS = [{x:-340,z:-560,rx:260,rz:190,depth:.5},{x:-150,z:150,rx:220,rz:160,depth:1.2},{x:-780,z:610,rx:160,rz:180,depth:2.3}];
/** Fictional bathymetry in metres below mean sea level. */
export function depthAt(x:number,z:number,tide=0):number {
  let depth=9+3*Math.sin(x/1400)*Math.cos(z/1700);
  for(const a of SHOALS) {const r=Math.hypot((x-a.x)/a.rx,(z-a.z)/a.rz); if(r<1.8)depth=Math.min(depth,a.depth+7*Math.min(1,r*r));}
  for(const r of ROCKS)depth=Math.min(depth,Math.max(-2,(Math.hypot(x-r.x,z-r.z)-r.radius*.7)*.08));
  return depth+tide;
}
export const degrees=(r:number)=>((r*180/Math.PI)%360+360)%360;
export function instruments(s:VesselState) {return {heading:Math.round(degrees(s.heading))%360,speed:Math.hypot(s.surge,s.sway)/KNOT};}
export class Marine {
  time=0; hour=14; tide=0; tidePhase=0; wind=10; direction=250; waves=.6; visibility=7000;
  sea:SeaState='belle'; targetDirection=250; evolving=true; dayCycle=true; tideCycle=true;
  damageEnabled=true; sound=true; damage=0; depth=9; clearance=7.1; warning='';
  currentX=0; currentZ=0; private cooldown=0;
  private force:ExternalForce={x:0,z:0,yaw:0};
  update(dt:number):void {
    this.time+=dt;this.cooldown=Math.max(0,this.cooldown-dt);
    if(this.dayCycle)this.hour=(this.hour+dt/60)%24;
    if(this.tideCycle)this.tidePhase=(this.tidePhase+dt*Math.PI*2/720)%(Math.PI*2);
    this.tide=2.4*Math.sin(this.tidePhase);
    const [wind,waves,visibility]=SEA[this.sea], blend=1-Math.exp(-dt/18);
    const variation=this.evolving?1+.3*Math.sin(this.time/65):1;
    this.wind+=(wind*variation-this.wind)*blend;this.waves+=(waves*variation-this.waves)*blend;
    this.visibility+=(visibility/variation-this.visibility)*blend;
    const target=this.targetDirection+(this.evolving?25*Math.sin(this.time/90):0);
    this.direction+=((target-this.direction+540)%360-180)*blend;this.direction=(this.direction+360)%360;
    this.currentX=.65*Math.cos(this.tidePhase);this.currentZ=-.25*Math.cos(this.tidePhase);
  }
  get daylight():number {return clamp((Math.sin((this.hour-6)/24*Math.PI*2)+.12)/.8,.04,1);}
  get performance():number {return this.damageEnabled?1-this.damage*.75:1;}
  forces(s:VesselState):ExternalForce {
    const angle=this.direction*Math.PI/180, windForce=this.wind*this.wind*8;
    const wave=Math.sin(this.time*.8+s.x*.035)*this.waves*2300;
    this.force.x=-Math.sin(angle)*(windForce+wave)+this.currentX*12000;
    this.force.z=Math.cos(angle)*(windForce+wave)+this.currentZ*12000;
    this.force.yaw=Math.sin(angle-s.heading)*wave*4;
    return this.force;
  }
  hazards(s:VesselState,contact:string,impact:number,dt:number):boolean {
    this.depth=depthAt(s.x,s.z,this.tide);
    this.clearance=Math.min(...[-10,0,10].map(f=>depthAt(s.x+Math.sin(s.heading)*f,s.z-Math.cos(s.heading)*f,this.tide)))-BOAT.draft;
    const speed=Math.hypot(s.surge,s.sway);
    const ahead=depthAt(s.x+Math.sin(s.heading)*Math.max(30,speed*12),s.z-Math.cos(s.heading)*Math.max(30,speed*12),this.tide)-BOAT.draft;
    const grounded=this.clearance<=0;
    this.warning=contact?`Contact : ${contact}`:grounded?'Échouement':Math.min(this.clearance,ahead)<1?'Attention : haut-fond':this.visibility<3000?'Visibilité réduite':'';
    if(this.damageEnabled) {
      if(contact&&impact>.45&&this.cooldown===0){this.damage=clamp(this.damage+impact*impact*.012,0,1);this.cooldown=2;}
      if(grounded)this.damage=clamp(this.damage+speed*.008*dt,0,1);
    }
    return grounded;
  }
}
