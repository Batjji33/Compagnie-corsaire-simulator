import type { BoatParameters } from '../ships/parameters.ts';
import type { MissionDefinition } from './definitions.ts';
import { MALO_DINARD } from './definitions.ts';

/** Adapt loads and cruising time to the ship; Saint-Malo–Dinard keeps its fixed timetable. */
export function vesselMission(definition:MissionDefinition,boat:BoatParameters):MissionDefinition {
  if(definition.cruiseKnots<=boat.maxSpeedKnots&&definition.passengers<=boat.passengers)return definition;
  const cruise=Math.min(definition.cruiseKnots,boat.maxSpeedKnots),ratio=definition.cruiseKnots/cruise;
  return {...definition,passengers:Math.min(definition.passengers,boat.passengers),cruiseKnots:cruise,
    targetSeconds:definition.id===MALO_DINARD.id?MALO_DINARD.targetSeconds:Math.ceil(definition.targetSeconds*ratio),
    comments:{...definition.comments,crossing:definition.comments.crossing.replace(/\d+(?:[.,]\d+)? nd/g,`${cruise} nd`)}};
}
