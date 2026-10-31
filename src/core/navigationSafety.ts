import type { VesselState } from '../physics/VesselDynamics.ts';
import type { BoatParameters } from '../ships/parameters.ts';
import type { ShoreContact } from '../physics/ShoreContact.ts';
import type { Traffic } from '../traffic/Traffic.ts';
import type { Marine } from '../weather/Marine.ts';
import type { Mission } from '../missions/Mission.ts';
import { closestApproach } from '../traffic/Traffic.ts';
import { depthAt } from '../weather/Marine.ts';
import { BAY, DOCKS } from '../world/geography.ts';

export interface NavigationSafety {
  state:VesselState; boat:BoatParameters; shore:ShoreContact;
  marine:Marine; traffic:Traffic; mission?:Mission; actionPending?:boolean;
}

/** Thirty SIMULATED seconds of warning, including at least 3.75 real seconds at x8.
 * Check every 0.1 simulated second, plus immediately on a player speed request.
 * Predict both the current turning arc and the straight velocity tangent; sampling
 * spacing <= 8 m and hull-sized margins also cover narrow quays and channels.
 */
export function accelerationDanger(c:NavigationSafety):string|undefined {
  const {state:s,boat,marine,traffic,mission:m}=c;
  if(c.actionPending)return 'action du joueur requise';
  if(!m||m.moored||m.phase==='approach'||m.phase==='docking')return 'manœuvre au port';
  if(marine.damage>=m.definition.rules.maxDamage||marine.clearance<=.5)return 'sécurité du navire';
  const sin=Math.sin(s.heading),cos=Math.cos(s.heading);
  const player={x:s.x,z:s.z,vx:sin*s.surge+cos*s.sway,vz:-cos*s.surge+sin*s.sway};
  const speed=Math.hypot(s.surge,s.sway),horizon=30;
  if(traffic.enabled)for(const a of traffic.agents) {
    if(!a.active)continue;
    const margin=30+(boat.length+a.route.length)/2;
    const distance=Math.hypot(a.x-s.x,a.z-s.z),cpa=closestApproach(player,a,horizon);
    if(distance<margin||cpa.closing&&cpa.distance<margin)return `risque de collision avec ${a.route.name}`;
    // A manoeuvring vessel may turn across our path even if its current CPA is clear.
    if((a.avoiding||a.taxi)&&distance<margin+(speed+a.speed)*8)return 'trafic en manœuvre';
  }
  const hull=boat.length/2+boat.beam/2,step=Math.min(1,8/Math.max(speed,1));
  let x=s.x,z=s.z,heading=s.heading;
  // Reserve extra space for throttle applied from rest and the next safety poll.
  const margin=hull+20+speed*.2;
  const waypoint=m.definition.excursion?m.waypoint:undefined;
  const destination=m.definition.destination;
  for(let t=0;t<=horizon;t+=step) {
    const tangentX=s.x+player.vx*t,tangentZ=s.z+player.vz*t;
    for(const p of [{x,z},{x:tangentX,z:tangentZ}]) {
      if(p.x-margin<BAY.minX||p.x+margin>BAY.maxX||p.z-margin<BAY.minZ||p.z+margin>BAY.maxZ)return 'limite de navigation';
      if(DOCKS.some(d=>Math.hypot(p.x-d.point[0],p.z-d.point[1])<100+hull))return 'approche du port';
      // Arrival rules use the same authored radii as the mission state machine.
      if(Math.hypot(p.x-destination.berth.x,p.z-destination.berth.z)<destination.approachRadius+hull)return 'approche du port';
      if(waypoint&&Math.hypot(p.x-waypoint.x,p.z-waypoint.z)<(waypoint.radius??130)+hull)return 'étape de mission';
      if(traffic.enabled&&Math.abs(s.yawRate)>.002)for(const a of traffic.agents) {
        if(a.active&&Math.hypot(p.x-a.x-a.vx*t,p.z-a.z-a.vz*t)<30+(boat.length+a.route.length)/2)return `risque de collision avec ${a.route.name}`;
      }
      const obstacle=c.shore.nearby(p.x,p.z,margin);
      if(obstacle)return obstacle==='quay'?'approche du quai':obstacle==='rock'?'rochers dangereux':'côte ou passage étroit';
      // Bathymetry at the hull ends and sides, including a conservative falling tide.
      const tide=Math.min(marine.tide,2.4*Math.sin(marine.tidePhase+(marine.tideCycle?t*Math.PI*2/720:0)));
      for(const [dx,dz] of [[0,0],[sin*hull,-cos*hull],[-sin*hull,cos*hull],[cos*boat.beam,sin*boat.beam],[-cos*boat.beam,-sin*boat.beam]]) {
        if(depthAt(p.x+dx,p.z+dz,tide)-boat.draft<1)return 'haut-fond dangereux';
      }
    }
    heading+=s.yawRate*step;
    x+=(Math.sin(heading)*s.surge+Math.cos(heading)*s.sway)*step;
    z+=(-Math.cos(heading)*s.surge+Math.sin(heading)*s.sway)*step;
  }
}
