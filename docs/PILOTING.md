# Pilotage du Corsaire d’Émeraude

## Référence et modèle

Référence principale consultée le 29 octobre 2026 : [fiche et photos de la Compagnie Corsaire](https://compagniecorsaire.com/la-compagnie-dinard-saint-malo-bus-de-mer-croisieres-commentees/nos-bateaux/corsaire-demeraude/). Elle annonce un monocoque de 26,30 × 7,50 m, tirant d’eau de 1,90 m, 270 passagers, deux moteurs Baudouin et 19,5 nœuds. Les chiffres demandés sont retenus ; les caractéristiques publiées ne donnent pas de courbes hydrodynamiques.

Le modèle original reprend la coque gris-vert, le salon blanc aux grands vitrages sombres, la passerelle surélevée à l’avant et le pont supérieur découvert : sièges, rambardes, arceau arrière, escalier, défenses, bouées, mât, antenne et feux. Les volumes, les aménagements et le poste intérieur sont interprétés, sans revendication de reproduction exacte. La capacité est une référence, pas une foule de 270 personnages simulés.

Aucun asset photographique tiers n’est distribué. La photo consultée reste dans `.qa/` ignoré par Git. Modèle et textures de nom/instruments créés dans le code, sans nouveau téléchargement au démarrage ni nouvelle dépendance npm. Les maillages statiques sont fusionnés par matériau ; les deux écrans du cockpit montrent les valeurs de simulation, sans instruments décoratifs prétendument actifs.

## Démarrer et manœuvrer

Le bateau commence immobile, moteurs au neutre, le long de la face extérieure de la cale de Dinan, cap à l’ouest. Les commandes sont disponibles immédiatement, sans simulation de démarrage électrique du moteur.

1. Monter progressivement les deux manettes à la même valeur pour quitter le quai en ligne droite.
2. Déplacer la barre : la consigne et l’angle effectivement atteint sont affichés séparément.
3. Passer au neutre pour laisser ralentir. Pour freiner davantage, commander progressivement l’arrière ; le passage de marche prend du temps.
4. À faible vitesse, différencier les moteurs pour faire pivoter le navire. Une poussée avant et une poussée arrière égales en consigne ne s’annulent pas exactement : la marche arrière est moins efficace.
5. Choisir Cockpit ou Extérieur. La vue extérieure tourne et zoome ; les vues de la baie restent disponibles dans le sélecteur.

La distance affichée est celle du centre du navire au point de cale : elle n’est pas un dégagement précis de coque. Les contacts amortis avec côtes, principaux rochers et quais permettent une tentative d’approche. Il n’existe pas encore d’amarrage, de réussite de mission, de dégâts ou d’assistance automatique.

## Commandes

| Entrée | Action |
| --- | --- |
| Deux manettes tactiles / souris | Commandes indépendantes de −100 % (arrière) à +100 % (avant), maintenues après relâchement |
| Neutre sous chaque moteur | Mettre ce moteur seul au neutre |
| Deux moteurs au neutre / Espace | Retirer la demande de propulsion ; ne bloque pas la vitesse |
| Barre tactile / souris | Consigne de −35° bâbord à +35° tribord |
| Au milieu / X | Consigne zéro ; retour progressif du gouvernail |
| Flèches haut / bas maintenues | Augmenter / réduire les deux manettes |
| Q / A maintenues | Augmenter / réduire bâbord |
| E / D maintenues | Augmenter / réduire tribord |
| Flèches gauche / droite maintenues | Déplacer progressivement la consigne de barre |
| C | Basculer cockpit / extérieur |
| Glisser, molette, pincer, +/− | Rotation et zoom extérieurs ; zoom limité du champ de vision au cockpit |
| Sélecteur de lieu | Explorer librement la baie ; les manettes restent actives et persistantes |
| Recentrer / R | Revenir à la vue extérieure du bateau, sans le téléporter ni modifier les moteurs |
| Pause | Suspendre physique et mouvements de mer, garder la caméra disponible |

Les raccourcis de conduite n’interceptent pas les champs de formulaire. Sur un curseur focalisé, les flèches natives permettent un réglage fin. En exploration, les anciens raccourcis de déplacement de caméra sont préservés. Perdre le focus ou masquer l’onglet efface les touches maintenues, mais conserve les consignes des manettes.

## Physique et réglages

`src/ships/parameters.ts` centralise dimensions, masse d’essai (95 t), inertie en lacet, poussée, écartement des moteurs, traînées, gouvernail, contacts, ondulation et caméra. **Masse, poussées et coefficients sont calibrés pour le jeu, pas issus d’essais du navire réel.** La puissance nominale des moteurs n’est pas assimilée à une poussée constante réelle.

`VesselDynamics` est indépendant de Three.js et du DOM. À chaque pas fixe de 1/60 s :

- Réponse exponentielle des moteurs, avec passage par le ralenti et temporisation au neutre lors d’une inversion.
- Forces longitudinales, traînée linéaire/quadratique et réduction de poussée en arrière.
- Vitesse latérale, résistance latérale et couplage avec le lacet : le bateau peut dériver pendant un virage.
- Force du gouvernail dépendant du carré de la vitesse signée, angle limité et vitesse de déplacement de barre limitée.
- Couple différentiel des moteurs et amortissement du lacet, avec inertie de rotation.

La vitesse maximale de 19,5 nœuds résulte de l’équilibre poussée/traînée en ligne droite, sans limiteur qui coupe brutalement la vitesse. La marche arrière est réglée à environ 6,2 nœuds. À vitesse nulle, la barre seule ne fait pas tourner le navire ; les moteurs différenciés permettent la manœuvre. Pas encore de courant, vent, effet de berge, cavitation ni souffle d’hélice sur le gouvernail.

`ShoreContact` utilise trois cercles le long de la coque, des contours côtiers et des volumes de quai simplifiés. Les forces de ressort/amortisseur et le couple de contact évitent un arrêt arbitraire au simple changement de commande. Ce n’est pas un solveur naval de collision précis ; les bouées et détails de rambardes ne sont pas des obstacles physiques.

L’état précédent et l’état courant sont interpolés au rendu. Roulis, tangage et pilonnement sont uniquement visuels, de faible amplitude ; la caméra suit la position et le cap planaires, sans reprendre l’oscillation de coque. Le cockpit est stabilisé et son architecture intérieure est une interprétation. La suspension d’onglet ne crée pas de rattrapage de minutes de simulation.

## Validation et limites

16 tests automatisés : fondations et géographie conservées, bornes des commandes, réponse de barre, accélération/vitesse cible, inertie au neutre, arrière, poussée différentielle, giration, déterminisme 30/144 FPS, contacts aux deux quais, temporisation d’inversion, barre en arrière et interpolation au passage du nord.

Vérification Chromium avec gestes tactiles réels simulés : déplacement simultané et indépendant des manettes, persistance, neutre individuel, barre, clavier, changement de vue, exploration, départ du quai et stabilité d’horizon. Inspection des formats tablette/PC/portrait et paysage compact. Les captures et scripts ponctuels sont dans `.qa/`.

La vue extérieure de départ en qualité légère a mesuré 77 appels de rendu et environ 71 000 triangles (baie comprise). Le JavaScript complet reste autour de 172 Ko gzip ; Vite signale que le bloc non compressé dépasse légèrement le seuil indicatif de 650 Ko. Aucun changement du seuil n’a masqué cet avertissement. FPS Safari/iPad réel à mesurer : une émulation tactile Chromium ne certifie pas la fluidité de l’appareil cible.

Pas de missions, horaires, passagers interactifs, audio, sauvegarde de traversée ou phase suivante.
