# Navire pilotable

`Vessel.ts` assemble état physique, contacts et représentation interpolée. `CorsaireModel.ts` construit le modèle original avec ses instruments cockpit. `ShipGeometry.ts` crée la coque profilée ; `parameters.ts` centralise les réglages.

`SaintMaloModel.ts` ajoute le catamaran Corsaire de Saint-Malo, sélectionnable sans remplacer l’Émeraude. Les systèmes reçoivent les paramètres du navire sélectionné. Références photographiques, optimisations et approximations : [Corsaire de Saint-Malo](../../docs/SAINT-MALO.md).

Références, commandes et limites : [pilotage](../../docs/PILOTING.md). Le chargeur GLB de `world/assets.ts` reste disponible pour une ressource future ; aucun modèle externe n’est requis.
