export interface DockingRules { distance:number; speedKnots:number }

/** Shared arrival rules, also inherited by future missions and used by the HUD/marker. */
export const DEFAULT_DOCKING_RULES:Readonly<DockingRules>=Object.freeze({distance:30,speedKnots:2});
export function dockingRules(definition:{docking?:DockingRules}):Readonly<DockingRules> {
  return definition.docking??DEFAULT_DOCKING_RULES;
}
