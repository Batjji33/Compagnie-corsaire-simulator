import { SHIPS } from './parameters';
/** Inspection entries deliberately do not masquerade as calibrated playable vessels. */
export const COMPANIES = {
  corsaire: { name: 'Compagnie Corsaire', ships: Object.entries(SHIPS).map(([id, ship]) => ({ id, name: ship.name, status: 'playable' as const })) },
  brittany: { name: 'Brittany Ferries', ships: [{ id: 'brittany-saint-malo', name: 'Saint-Malo', status: 'inspection' as const }] },
};
export const BRITTANY_SAINT_MALO = { length: 194.7, beam: 27.8, draft: 6.6, passengers: 1290 } as const;
