import { clamp } from '../ships/parameters.ts';
export type PropulsionMode='electric'|'lng'|'hybrid';
/** Published ratings; efficiencies, hotel load, fuel inventory and charge rate are simulation estimates. */
export const HYBRID_SPEC={batteryKWh:11200,thermalKW:27480,electricKW:9600,thrusterKW:5400,hotelKW:800,shoreKW:6000,efficiency:.94,kgPerKWh:.16} as const;
export class HybridPlant {
 private thermalReadiness=1;
 mode:PropulsionMode='hybrid';batteryKWh=8960;fuelKg=200000;shore=false;
 deliveredKW=0;batteryKW=0;thermalKW=0;fuelKgHour=0;chargeKW=0;availableKW=0;enginesOnline=0;
 get soc(){return this.batteryKWh/HYBRID_SPEC.batteryKWh;}
 step(dt:number,shaftKW:number,auxKW=0):number{
  if(!Number.isFinite(dt)||dt<=0||dt>.1)throw new Error('Energy step must be in (0, .1]');
  const s=HYBRID_SPEC,demand=Math.max(0,shaftKW)+Math.max(0,auxKW)+s.hotelKW;
  this.thermalKW=this.batteryKW=this.chargeKW=this.deliveredKW=this.fuelKgHour=0;this.enginesOnline=0;
  if(this.shore){this.availableKW=0;this.chargeKW=Math.min(s.shoreKW-s.hotelKW,(s.batteryKWh-this.batteryKWh)*3600/dt/s.efficiency);this.batteryKWh=Math.min(s.batteryKWh,this.batteryKWh+this.chargeKW*s.efficiency*dt/3600);return 0;}
  const target=this.mode==='electric'||this.fuelKg<=0?0:1;this.thermalReadiness+=(target-this.thermalReadiness)*(1-Math.exp(-dt/20));
  const batteryLimit=Math.min(s.electricKW,this.batteryKWh*3600/dt*s.efficiency);
  const thermalLimit=this.mode==='electric'?0:Math.min(s.thermalKW*this.thermalReadiness,this.fuelKg*3600/dt/s.kgPerKWh);
  const electricLimit=this.mode==='lng'?0:batteryLimit;
  // Shared shaft rating: combined mode displaces fuel, it does not add unlimited shaft power.
  this.availableKW=Math.max(0,Math.min(s.thermalKW,thermalLimit+electricLimit)-s.hotelKW-auxKW);
  const requested=Math.min(demand,s.thermalKW);
  if(this.mode==='electric')this.batteryKW=Math.min(requested,batteryLimit);
  else if(this.mode==='lng')this.thermalKW=Math.min(requested,thermalLimit);
  else{
   const share=this.soc>.15?.35:0;this.batteryKW=Math.min(requested*share,batteryLimit);
   this.thermalKW=Math.min(requested-this.batteryKW,thermalLimit);
   this.batteryKW+=Math.min(Math.max(0,requested-this.thermalKW-this.batteryKW),Math.max(0,batteryLimit-this.batteryKW));
  }
  const supply=this.thermalKW+this.batteryKW;
  this.deliveredKW=Math.max(0,supply-s.hotelKW);
  this.batteryKWh=clamp(this.batteryKWh-this.batteryKW/s.efficiency*dt/3600,0,s.batteryKWh);
  this.fuelKgHour=this.thermalKW*s.kgPerKWh;this.fuelKg=Math.max(0,this.fuelKg-this.fuelKgHour*dt/3600);
  this.enginesOnline=this.thermalKW>13740?2:this.thermalKW>0?1:0;
  return shaftKW+auxKW>0?clamp(this.deliveredKW/(shaftKW+auxKW),0,1):0;
 }
}
