import { VesselDynamics } from './VesselDynamics.ts';
import type { ExternalForce } from './VesselDynamics.ts';
import { BOAT,clamp,KNOT } from '../ships/parameters.ts';
import { HybridPlant,HYBRID_SPEC } from '../energy/HybridPlant.ts';
/** Ferry-only calibration. Mass is displacement estimate, never gross tonnage converted to mass. */
export const FERRY_PARAMETERS={...BOAT,length:194.7,beam:27.8,draft:6.6,passengers:1290,maxSpeedKnots:23,
 mass:24_000_000,yawInertia:85_000_000_000,engineThrust:800000,engineArm:9,
 engineResponse:8,shiftNeutralTime:4,reverseEfficiency:.55,reverseMaxSpeed:4,
 surgeLinearDrag:20000,swayLinearDrag:2_000_000,swayQuadraticDrag:1_800_000,
 yawLinearDrag:1_500_000_000,yawSpeedDrag:800_000_000,yawQuadraticDrag:120_000_000_000,
 rudderLift:55000,rudderArm:78,rudderRateDegrees:3};
export class FerryDynamics extends VesselDynamics {
 readonly plant=new HybridPlant();
 bowCommand=0;bowActual=0;
 environment={windKnots:8,windFrom:250,currentKnots:.25,currentTo:70,waves:.6};
 elapsed=0;groundSpeed=0;
 constructor(spawn?:{x:number;z:number;heading:number}){super(spawn);this.parameters=FERRY_PARAMETERS;}
 override step(dt:number,external:ExternalForce={x:0,z:0,yaw:0}):void{
  if(!Number.isFinite(dt)||dt<=0||dt>.1)throw new Error('Ferry step must be in (0,.1]');
  const s=this.state,e=this.environment,angle=Math.PI/180,sin=Math.sin(s.heading),cos=Math.cos(s.heading);
  this.bowActual+=(clamp(this.bowCommand,-1,1)-this.bowActual)*(1-Math.exp(-dt/3));
  const shaft=(Math.abs(s.port)+Math.abs(s.starboard))*13740*Math.max(.18,Math.abs(s.surge)/(23*KNOT));
  const aux=Math.abs(this.bowActual)*HYBRID_SPEC.thrusterKW;
  this.powerFactor=this.plant.step(dt,shaft,aux);
  if(this.plant.shore){Object.assign(s,{surge:0,sway:0,yawRate:0,port:0,starboard:0});this.bowActual=0;this.groundSpeed=0;return;}
  const wx=-Math.sin(e.windFrom*angle)*e.windKnots*KNOT,wz=Math.cos(e.windFrom*angle)*e.windKnots*KNOT;
  const fore=wx*sin-wz*cos-s.surge,side=wx*cos+wz*sin-s.sway;
  const wf=.5*1.225*650*fore*Math.abs(fore),ws=.5*1.225*3800*side*Math.abs(side);
  const bow=280000*this.bowActual*this.powerFactor/(1+(Math.abs(s.surge)/1.8)**2);
  this.elapsed+=dt;
  const waveYaw=Math.sin(this.elapsed*.17)*e.waves*1_000_000;
  super.step(dt,{x:external.x+wf*sin+(ws+bow)*cos,z:external.z-wf*cos+(ws+bow)*sin,yaw:external.yaw+ws*12+bow*76+waveYaw});
  const cx=Math.sin(e.currentTo*angle)*e.currentKnots*KNOT,cz=-Math.cos(e.currentTo*angle)*e.currentKnots*KNOT;
  s.x+=cx*dt;s.z+=cz*dt;
  this.groundSpeed=Math.hypot(Math.sin(s.heading)*s.surge+Math.cos(s.heading)*s.sway+cx,-Math.cos(s.heading)*s.surge+Math.sin(s.heading)*s.sway+cz);
 }
}
