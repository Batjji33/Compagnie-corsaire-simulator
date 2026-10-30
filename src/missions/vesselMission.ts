import type { BoatParameters } from '../ships/parameters.ts';
import type { MissionDefinition } from './definitions.ts';

/** Keep authored routes, docking and sea conditions; adapt loads and cruising time to the ship. */
export function vesselMission(definition:MissionDefinition,boat:BoatParameters):MissionDefinition {
  if(definition.cruiseKnots<=boat.maxSpeedKnots&&definition.passengers<=boat.passengers)return definition;
  const cruise=Math.min(definition.cruiseKnots,boat.maxSpeedKnots),ratio=definition.cruiseKnots/cruise;
  return {...definition,passengers:Math.min(definition.passengers,boat.passengers),cruiseKnots:cruise,
    targetSeconds:Math.ceil(definition.targetSeconds*ratio),maxSeconds:Math.ceil(definition.maxSeconds*ratio),
    comments:{...definition.comments,crossing:definition.comments.crossing.replace(/\d+(?:[.,]\d+)? nd/g,`${cruise} nd`)}};
}
