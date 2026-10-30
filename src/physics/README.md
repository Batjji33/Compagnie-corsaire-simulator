# Physique maritime simplifiée

`VesselDynamics.ts` calcule avance, dérive et lacet à 60 Hz. Unités : mètres, secondes, radians, newtons ; Y vertical, nord vers −Z, cap positif vers tribord. Les états précédent/courant sont conservés pour interpolation, sans mutation par le rendu.

`ShoreContact.ts` apporte des forces de contact amorties aux côtes et quais simplifiés. Aucun DOM ou renderer dans ces modules. Les paramètres sont dans `ships/parameters.ts` ; voir [le modèle et ses limites](../../docs/PILOTING.md).

Les obstacles de quai portent le type `quay`. Les forces restent actives sur toute
la coque, mais seuls les contacts sur les extrémités avant/arrière déclenchent
`label` et `impactSpeed` aux quais ; les appuis latéraux sont absorbés par les
boudins sans incident ni dégât. Le test combine le cercle d'extrémité et la normale
de contact orientée vers son capot, pour ne pas confondre le flanc d'un cercle
avant/arrière avec la pointe du navire. Les côtes (`shore`) et rochers restent
signalés sur toute la coque. Un appui au quai ne masque pas un autre obstacle,
même si sa pénétration est plus faible. Le trafic garde son propre solveur.
