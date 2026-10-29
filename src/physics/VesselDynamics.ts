import { BOAT, KNOT, clamp } from '../ships/parameters.ts';
export interface HelmCommand { port: number; starboard: number; rudder: number }
export interface VesselState {
  x: number; z: number; heading: number; surge: number; sway: number; yawRate: number;
  port: number; starboard: number; rudder: number;
}
interface Engine { value: number; gear: number; neutral: number }
export interface ExternalForce { x:number; z:number; yaw:number }
/** Planar body-axis dynamics: surge forward, sway starboard, heading clockwise from north. */
export class VesselDynamics {
  readonly command: HelmCommand = { port: 0, starboard: 0, rudder: 0 };
  readonly state: VesselState;
  readonly previous: VesselState;
  private engines: Engine[] = [{ value:0,gear:0,neutral:0 },{ value:0,gear:0,neutral:0 }];
  constructor(spawn: {x:number;z:number;heading:number} = BOAT.spawn) {
    this.state={...spawn,surge:0,sway:0,yawRate:0,port:0,starboard:0,rudder:0};
    this.previous={...this.state};
  }
  setCommand(update: Partial<HelmCommand>): void {
    for(const key of ['port','starboard','rudder'] as const) if(update[key]!==undefined) this.command[key]=clamp(update[key],-1,1);
  }
  private engine(index:number, requested:number, dt:number):number {
    const engine=this.engines[index], desired=Math.sign(requested);
    // Reversal passes through idle, then a short neutral gear-change interval.
    const reversing=desired!==0&&engine.gear!==0&&desired!==engine.gear;
    let target=requested;
    if(reversing) {
      target=0;
      if(Math.abs(engine.value)<.02) {engine.value=0;engine.gear=0;engine.neutral=BOAT.shiftNeutralTime;}
    }
    if(engine.neutral>0) {engine.neutral=Math.max(0,engine.neutral-dt);target=0;}
    else if(!reversing&&desired!==0)engine.gear=desired;
    engine.value+=(target-engine.value)*(1-Math.exp(-dt/BOAT.engineResponse));
    return engine.value;
  }
  step(dt:number,external:ExternalForce={x:0,z:0,yaw:0}):void {
    if(!Number.isFinite(dt)||dt<=0||dt>.1) throw new Error('Le pas physique doit être positif et inférieur à 100 ms.');
    Object.assign(this.previous,this.state);
    const s=this.state;
    s.port=this.engine(0,this.command.port,dt);s.starboard=this.engine(1,this.command.starboard,dt);
    const target=this.command.rudder*BOAT.rudderMaxDegrees*Math.PI/180;
    const rudderStep=BOAT.rudderRateDegrees*Math.PI/180*dt;
    s.rudder+=clamp(target-s.rudder,-rudderStep,rudderStep);
    const thrust=(lever:number)=>BOAT.engineThrust*lever*(lever<0?BOAT.reverseEfficiency:1);
    const port=thrust(s.port),starboard=thrust(s.starboard),speed=BOAT.maxSpeedKnots*KNOT;
    const dragForward=(2*BOAT.engineThrust-BOAT.surgeLinearDrag*speed)/(speed*speed);
    const dragReverse=(2*BOAT.engineThrust*BOAT.reverseEfficiency-BOAT.surgeLinearDrag*BOAT.reverseMaxSpeed)/(BOAT.reverseMaxSpeed**2);
    const drag=BOAT.surgeLinearDrag*s.surge+(s.surge>=0?dragForward:dragReverse)*s.surge*Math.abs(s.surge);
    const rudderForce=-BOAT.rudderLift*s.surge*Math.abs(s.surge)*Math.sin(s.rudder);
    const lateralDrag=BOAT.swayLinearDrag*s.sway+BOAT.swayQuadraticDrag*s.sway*Math.abs(s.sway);
    const yawDrag=(BOAT.yawLinearDrag+BOAT.yawSpeedDrag*Math.abs(s.surge))*s.yawRate+BOAT.yawQuadraticDrag*s.yawRate*Math.abs(s.yawRate);
    const forwardForce=Math.sin(s.heading)*external.x-Math.cos(s.heading)*external.z;
    const sideForce=Math.cos(s.heading)*external.x+Math.sin(s.heading)*external.z;
    const du=(port+starboard-drag+forwardForce)/BOAT.mass+s.yawRate*s.sway;
    const dv=(rudderForce-lateralDrag+sideForce)/BOAT.mass-s.yawRate*s.surge;
    const dr=((port-starboard)*BOAT.engineArm-rudderForce*BOAT.rudderArm-yawDrag+external.yaw)/BOAT.yawInertia;
    s.surge+=du*dt;s.sway+=dv*dt;s.yawRate+=dr*dt;
    // Heading stays unwrapped to interpolate smoothly across north.
    s.heading+=s.yawRate*dt;
    s.x+=(Math.sin(s.heading)*s.surge+Math.cos(s.heading)*s.sway)*dt;
    s.z+=(-Math.cos(s.heading)*s.surge+Math.sin(s.heading)*s.sway)*dt;
  }
  interpolate(alpha:number,out:VesselState):VesselState {
    const t=clamp(alpha,0,1);
    for(const key of Object.keys(this.state) as (keyof VesselState)[]) out[key]=this.previous[key]+(this.state[key]-this.previous[key])*t;
    return out;
  }
}
