import type { BoatParameters } from './parameters.ts';
import { BOAT, clamp } from './parameters.ts';
import type { VesselState } from '../physics/VesselDynamics.ts';

export const WAKE_CAPACITY=144,WAKE_LIFETIME=24;
export interface WakeSample {x:number;z:number;dx:number;dz:number;time:number;speed:number;power:number}
/** Fixed-size world-space history, independent of rendering FPS and subsequent heading changes. */
export class WakeTrail {
  parameters:BoatParameters=BOAT;
  readonly samples:WakeSample[]=Array.from({length:WAKE_CAPACITY},()=>({x:0,z:0,dx:0,dz:1,time:-100,speed:0,power:0}));
  count=0;private head=0;private elapsed=0;private previousX=NaN;private previousZ=NaN;
  clear():void {this.count=0;this.head=0;this.elapsed=0;this.previousX=this.previousZ=NaN;}
  at(index:number):WakeSample {return this.samples[(this.head-1-index+WAKE_CAPACITY)%WAKE_CAPACITY];}
  update(dt:number,time:number,s:VesselState,moored=false):void {
    if(Math.hypot(s.x-this.previousX,s.z-this.previousZ)>60)this.clear();
    this.previousX=s.x;this.previousZ=s.z;
    while(this.count&&time-this.at(this.count-1).time>WAKE_LIFETIME)this.count--;
    this.elapsed+=dt;const speed=Math.hypot(s.surge,s.sway);
    if(this.elapsed<.18||moored||speed<.25)return;
    this.elapsed=0;
    const sin=Math.sin(s.heading),cos=Math.cos(s.heading),direction=s.surge<-.15?-1:1;
    const vx=sin*s.surge+cos*s.sway,vz=-cos*s.surge+sin*s.sway;
    Object.assign(this.samples[this.head],{x:s.x-sin*this.parameters.length*.48*direction,z:s.z+cos*BOAT.length*.48*direction,dx:vx/speed,dz:vz/speed,time,speed,power:clamp((Math.abs(s.port)+Math.abs(s.starboard))/2,0,1)});
    this.head=(this.head+1)%WAKE_CAPACITY;this.count=Math.min(WAKE_CAPACITY,this.count+1);
  }
}
