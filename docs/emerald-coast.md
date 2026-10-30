# Côte d’Émeraude — carte de jeu

Le monde reste en mètres de jeu : X vers l’est, Z vers le sud, Y vertical,
eau moyenne à Y=0. Les coordonnées de Saint-Malo, Dinard, des cales et de
la mission historique sont conservées. Le domaine passe de 8,4 × 7,8 km à
18,4 × 11 km. Aucun changement de scène ni téléchargement en navigation.

## Géographie et sources

Les contours sont dessinés pour le jeu, sans import de relevé bathymétrique
ni prétention à une projection géographique exacte. La compression est
progressive et non uniforme, de l’ordre de 2:1 sur la côte occidentale.
Les positions WGS84 servent de références d’orientation, pas de GPS réel :

| Repère | Référence WGS84 approximative | Position de jeu du monument / île |
| --- | --- | --- |
| Cézembre | 48,677 N ; 2,071 O | X −2000 ; Z −4350 |
| Fort La Latte | 48,668 N ; 2,285 O | X −10290 ; Z −3110 |
| Phare du Cap Fréhel | 48,684 N ; 2,319 O | X −11660 ; Z −4390 |

Références consultées le 30 octobre 2026 :

- [Cézembre, données OSM présentées par Mapcarta](https://mapcarta.com/18401142).
- [Fort La Latte, OSM way 28431246 via Mapcarta](https://mapcarta.com/W28431246).
- [Phare du Cap Fréhel, OSM way 135722236 via Mapcarta](https://mapcarta.com/W135722236).
- [DIRM : position et hauteur du phare, 32,85 m](https://www.dirm.nord-atlantique-manche-ouest.developpement-durable.gouv.fr/phare-du-cap-frehel-a131.html).
- [Dinan-Cap Fréhel Tourisme : falaises de 70 m et implantation des caps](https://www.dinan-capfrehel.com/itineraires/du-cap-frehel-au-fort-la-latte/).
- [Saint-Malo Tourisme : forts et îlots](https://www.saint-malo-tourisme.com/vivre-comme-chez-nous/a-voir-a-faire/culture-patrimoine/acces-aux-forts-et-aux-ilots/).
- [© contributeurs OpenStreetMap, ODbL](https://www.openstreetmap.org/copyright).

La page cartographique OSM dynamique n’étant pas lisible par l’outil de recherche,
ses repères ont été recoupés avec les fiches Mapcarta et les offices de tourisme.
Les maillages, textures, quais et balises sont des interprétations originales.
Les profondeurs, routes et chenaux sont exclusivement fictifs.

## Navigation et extension

`EmeraldCoast.ts` contient les terres supplémentaires, les destinations et les
liaisons indicatives. `geography.ts` conserve la liste unique des terres et cales,
utilisée par le rendu, les collisions, l’atlas côtier, le radar et le trafic.
La carte générale montre toute la côte ; le bouton de centrage suit le bateau.
Le GPS reste local, avec cinq portées radar jusqu’à 5 km.

Cézembre dispose d’un quai physique et d’une approche par l’est du ponton.
Il faut dégager vers le sud avant de repartir à l’ouest. Cap Fréhel et Fort
La Latte sont des points d’observation en eau libre, sans faux port ni quai.
Le choix du point de départ ne s’applique qu’au lancement d’une nouvelle
navigation libre. Les déplacements en cours de navigation restent continus.
Le catalogue de missions propose désormais Cézembre avec débarquement,
Fort La Latte avec retour à la Bourse, et Cap Fréhel & Fort La Latte avec
retour à la Bourse, embarquement et étapes commentées. La mission Fort La Latte
est une variante courte de jeu du circuit réel combiné. Voir `src/missions/README.md`.
Les cales et missions Saint-Malo–Dinard restent actives.
Les commentaires personnalisés acceptent désormais toute l’étendue du monde.

## Rendu et vérifications

Maillages bas polygones, bâtiments instanciés, textures procédurales partagées,
détails proches seulement, groupes masqués derrière la limite de visibilité.
Les côtes restent présentes. L’atlas côtier 1024² conserve une résolution
adaptée à l’extension ; son calcul utilise les distances métriques sur les deux axes.
Le ciel suit la caméra pour couvrir aussi l’ouest. Le maillage marin conserve
son budget de sommets et sa densité locale, avec un horizon porté à 28 km.
Les collisions utilisent un rejet rapide par rectangle avant les calculs de contact.

Tests dédiés : parcours complets échantillonnés tous les 5 m, coque orientée
selon le trajet, contrôle de profondeur simulée à marée −2,4 m, points de départ,
contacts sur les nouveaux caps et 90 secondes de poussée continue contre les terres.
Les tests géographiques existants contrôlent également les nouveaux polygones.

Contrôle navigateur local Edge/WebGL : vues de Saint-Malo, Dinard, Cézembre,
Fort La Latte et Fréhel ; captures et compteurs dans `.qa/coast/` (non versionnés).
Les cinq départs libres sont contrôlés dans l’interface, sans exception JavaScript.
Profil léger : environ 44–49 milliers de triangles et 27–32 appels de rendu
sur les trois nouvelles destinations (compteurs de la scène complète).
`npm test` : 102 tests réussis. `npm run build` : réussi ; avertissement Vite
sur le bundle principal d’environ 813 ko (222 ko gzip), incluant Three.js.
La mesure sur Safari iPad reste nécessaire : les compteurs de rendu sur ordinateur
ne garantissent pas 30 FPS sur tablette. Le relief demeure stylisé et les anses
intermédiaires simplifiées ; il ne s’agit pas d’une restitution photogrammétrique.

Aucun déploiement.
