/** Published dimensions/speed; all hydrodynamic coefficients below are gameplay calibration. */
export const KNOT = 1852 / 3600;
export const BOAT = {
  length: 26.3, beam: 7.5, draft: 1.9, passengers: 270, maxSpeedKnots: 19.5,
  mass: 95000, yawInertia: 9_000_000,
  engineThrust: 20000, engineArm: 2.2, reverseEfficiency: 0.45,
  engineResponse: 2.2, shiftNeutralTime: 0.8,
  surgeLinearDrag: 600, reverseMaxSpeed: 3.2,
  swayLinearDrag: 23000, swayQuadraticDrag: 18000,
  yawLinearDrag: 1_600_000, yawSpeedDrag: 200000, yawQuadraticDrag: 4_000_000,
  rudderMaxDegrees: 35, rudderRateDegrees: 12, rudderLift: 680, rudderArm: 10,
  spawn: { x: 920, z: 264, heading: -Math.PI / 2 },
  motion: { heave: 0.12, roll: 0.012, pitch: 0.008 },
  contact: { stiffness: 65000, damping: 38000, friction: 4000 },
  camera: { externalDistance: 36, minDistance: 18, maxDistance: 240, cockpitHeight: 6.15, cockpitForward: 5.2 },
} as const;
export function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : 0;
}
