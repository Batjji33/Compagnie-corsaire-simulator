/** Published dimensions/speed; all hydrodynamic coefficients below are gameplay calibration. */
export const KNOT = 1852 / 3600;
export const BOAT = {
  length: 26.3, beam: 7.5, draft: 1.9, passengers: 270, maxSpeedKnots: 19.5,
  // Effective gameplay inertia: 50% of the previous calibration, not a measured displacement.
  mass: 47500, yawInertia: 4_500_000,
  engineThrust: 20000, engineArm: 3.2, reverseEfficiency: 0.6,
  engineResponse: 1, shiftNeutralTime: 0.35,
  surgeLinearDrag: 600, reverseMaxSpeed: 3.2,
  swayLinearDrag: 23000, swayQuadraticDrag: 18000,
  yawLinearDrag: 900_000, yawSpeedDrag: 200000, yawQuadraticDrag: 4_000_000,
  rudderMaxDegrees: 35, rudderRateDegrees: 20, rudderLift: 680, rudderArm: 10,
  spawn: { x: 920, z: 264, heading: -Math.PI / 2 },
  motion: { heave: 0.12, roll: 0.012, pitch: 0.008 },
  contact: { stiffness: 65000, damping: 38000, friction: 4000 },
  camera: { externalDistance: 36, minDistance: 18, maxDistance: 240, cockpitHeight: 6.15, cockpitForward: 5.2 },
} as const;
/** Widen numeric literals so each vessel owns its calibration. BOAT remains the legacy default. */
type Widen<T> = { -readonly [P in keyof T]: T[P] extends number ? number : Widen<T[P]> };
export type BoatParameters = Widen<typeof BOAT> & {catamaran?:boolean;speedLimitKnots?:number};
export const SAINT_MALO: BoatParameters = {
  ...BOAT, catamaran:true, speedLimitKnots:12, length:24, beam:7.8, draft:1.65, passengers:245, maxSpeedKnots:12,
  mass:62000, yawInertia:5_200_000, engineThrust:18000, engineArm:2.8,
  engineResponse:1.5, swayLinearDrag:32000, swayQuadraticDrag:24000,
  yawLinearDrag:1_100_000, yawQuadraticDrag:4_800_000, rudderArm:8.5,
  camera:{externalDistance:33,minDistance:16,maxDistance:240,cockpitHeight:5.95,cockpitForward:6.2},
};
export const SHIPS = {
  emeraude:{name:'Corsaire d’Émeraude',type:'Vedette',parameters:BOAT},
  'saint-malo':{name:'Corsaire de Saint-Malo',type:'Catamaran · 2 × MAN 360 kW + 1 GE',parameters:SAINT_MALO},
} as const;
export type ShipId = keyof typeof SHIPS;
export function isShipId(value:unknown):value is ShipId {return typeof value==='string'&&Object.hasOwn(SHIPS,value);}
export function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : 0;
}
/** Equally spaced lever positions; the requested thrust itself is deliberately nonlinear. */
export const ENGINE_NOTCHES = [-1, -.65, -.3, 0, .3, .65, 1] as const;
export function engineNotch(value:number):number {
  const bounded=clamp(value,-1,1);
  return ENGINE_NOTCHES.reduce<number>((best,notch,index)=>Math.abs(notch-bounded)<Math.abs(ENGINE_NOTCHES[best]-bounded)?index:best,3);
}
export function engineCommand(value:number):number { return ENGINE_NOTCHES[engineNotch(value)]; }
