import { SHIPS } from './parameters';
/** Company catalogue; the large ferry uses its own navigation scene and physics. */
export const COMPANIES = {
  corsaire: { name: 'Compagnie Corsaire', ships: Object.entries(SHIPS).map(([id, ship]) => ({ id, name: ship.name, status: 'playable' as const })) },
  brittany: { name: 'Brittany Ferries', ships: [{ id: 'brittany-saint-malo', name: 'Saint-Malo', status: 'playable' as const }] },
};
export const BRITTANY_SAINT_MALO = { length: 194.7, beam: 27.8, draft: 6.6, passengers: 1290 } as const;
