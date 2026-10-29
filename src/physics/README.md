# Physique maritime simplifiée

`VesselDynamics.ts` calcule avance, dérive et lacet à 60 Hz. Unités : mètres, secondes, radians, newtons ; Y vertical, nord vers −Z, cap positif vers tribord. Les états précédent/courant sont conservés pour interpolation, sans mutation par le rendu.

`ShoreContact.ts` apporte des forces de contact amorties aux côtes et quais simplifiés. Aucun DOM ou renderer dans ces modules. Les paramètres sont dans `ships/parameters.ts` ; voir [le modèle et ses limites](../../docs/PILOTING.md).
