import { BOAT, clamp } from '../ships/parameters.ts';
import type { MissionPhase } from '../missions/definitions.ts';
export interface PassengerSnapshot {satisfaction:number;discomfort:number}
export class Passengers {
  capacity:number=BOAT.passengers;
  count=0;total=180;satisfaction=100;discomfort=0;phase:MissionPhase|'free'='preparation';progress=0;
  private previousSpeed:number|undefined;
  waiting:Record<'malo'|'dinard',number>|undefined;
  transferPort:string|undefined;
  reset(snapshot?:PassengerSnapshot):void {
    this.count=0;this.satisfaction=clamp(snapshot?.satisfaction??100,0,100);this.discomfort=Math.max(0,snapshot?.discomfort??0);this.previousSpeed=undefined;this.waiting=undefined;this.transferPort=undefined;
  }
  update(dt:number,phase:MissionPhase|'free',phaseTime:number,total:number,boarding:number,unloading:number,speed:number,yaw:number,waves:number):void {
    total=Math.floor(clamp(total,0,this.capacity));this.phase=phase;this.total=total;
    this.progress=phase==='boarding'?clamp(phaseTime/boarding,0,1):phase==='unloading'?clamp(phaseTime/unloading,0,1):0;
    this.count=phase==='failed'?this.count:phase==='preparation'||phase==='complete'?0:phase==='boarding'?Math.floor(total*this.progress):phase==='unloading'?total-Math.floor(total*this.progress):total;
    if(this.count>0){
      const acceleration=this.previousSpeed===undefined||dt<=0?0:Math.abs(speed-this.previousSpeed)/dt;
      const discomfort=Math.max(0,acceleration-.3)*dt+Math.max(0,Math.abs(yaw)*speed-.25)*dt+Math.max(0,waves-.5)*dt*.025;
      this.discomfort+=discomfort;
      this.satisfaction=clamp(100-this.discomfort*1.8,0,100);
    }
    this.previousSpeed=speed;
  }
  snapshot():PassengerSnapshot{return {satisfaction:this.satisfaction,discomfort:this.discomfort};}
}
