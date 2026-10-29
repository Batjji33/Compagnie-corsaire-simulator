# Environnement Saint-Malo–Dinard — phase 1

## Périmètre

Décor original simplifié, en coordonnées métriques locales : X vers l’est, Y vertical, Z vers le sud. Ce n’est pas une projection géodésique. La proportion de fidélité demandée guide la sélection des silhouettes ; elle n’est pas une précision mesurée.

- Saint-Malo : remparts à tours, fronts de maisons à toits d’ardoise, silhouette de Saint-Vincent, château, môle, port et arrière-port.
- Dinard : pointes du Moulinet et de la Malouine, villas à tourelles, terrasses, jardins, Grand Hôtel interprété, promenade, plage de l’Écluse et cabines.
- Grand Bé, Petit Bé et Fort National : îlots distincts, forts et rochers.
- Cale de Dinan et embarcadère du Clair de Lune : structures fixes avec accès, pontons et défenses ; aucune mécanique d’accostage.
- Deux rives, sables, végétation ; mer animée, réflexion analytique du ciel, couleurs de faible profondeur et écume de rive.

## Réel, interprété et fictif

| Élément | Statut |
| --- | --- |
| Noms des lieux, relation générale entre les rives, présence des monuments | Réels, références ci-dessous |
| Cale de Dinan ; Clair de Lune et cale de la Vallée | Lieux réels ; la paire Dinan / Clair de Lune est désignée pour la future traversée |
| Contours, positions locales, dimensions, altitudes et monuments | Interprétation visuelle, aucune extraction cartographique |
| Maisons, quais, pontons, végétation, rochers | Créations procédurales ; pas des reproductions cadastrales |
| Chenal en pointillés, six marques rouges/vertes et hauts-fonds | Fictifs ; ni positions officielles ni consignes de navigation |
| Teintes des fonds et niveau marin | Artistiques ; aucune bathymétrie ou marée réelle |

La carte de l’interface indique ces distinctions. Son tracé est un repère schématique, pas un trajet automatisé. Aucun service de cartes, de météo ou de marées n’est appelé.

## Sources et droits

Consultation le 29 octobre 2026. Références factuelles uniquement : aucune photographie, carte, texture ou modèle tiers incorporé.

- [Compagnie Corsaire — embarcadères Saint-Malo](https://compagniecorsaire.com/ports-de-depart/acces-saint-malo-croisiere-bateau/) : distinction entre cale de Dinan et gare maritime de la Bourse.
- [Compagnie Corsaire — embarcadères Dinard](https://compagniecorsaire.com/ports-de-depart/acces-dinard/) : Clair de Lune sous le Grand Hôtel et cale de la Vallée.
- [Saint-Malo Tourisme — forts et îlots](https://www.saint-malo-tourisme.com/vivre-comme-chez-nous/a-voir-a-faire/culture-patrimoine/acces-aux-forts-et-aux-ilots/) : les Bé et Fort National.
- [Dinard Émeraude Tourisme — plan 2026](https://www.dinardemeraudetourisme.com/app/uploads/2026/03/dinard_plan_2026.pdf) : pointes, plage et villas.
- [Ille-et-Vilaine Tourisme — Dinard](https://www.ille-et-vilaine-tourisme.bzh/partez-a-la-decouverte-de-lille-et-vilaine/sites-remarquables/dinard/) : villas et promenade.

Géométries et quatre textures de 256 × 256 pixels créées dans le projet. Aucune attribution d’asset externe nécessaire. Les bibliothèques npm conservent leurs licences propres. Aucun GLB ajouté : les volumes instanciés conviennent au budget ; le chargeur GLB existant reste disponible.

## Organisation

`geography.ts` centralise contours, zones, cales, marques, rochers, limites de caméra, distances de détail et vues. Les groupes séparent Saint-Malo, Dinard, îlots et arrière-pays. Les identifiants Cézembre, Cancale et cap Fréhel sont réservés, sans construire ces destinations.

`BayEnvironment.ts` construit les surfaces et bandes côtières. `Batch.ts` regroupe les objets par primitive/matériau/zone dans des `InstancedMesh`. `Materials.ts` crée des textures déterministes partagées. `CoastAtlas.ts` produit un champ de distance de 512 × 512 pixels utilisé par la couleur et l’écume de la mer.

Pour étendre : ajouter les données d’une zone, ses groupes, puis étendre les bornes de l’atlas et de la carte. Les contours peuvent se recouvrir au raccord des masses terrestres ; l’eau reste un seul plan continu sous la baie. Les rochers et quais sont visibles, sans collider caché. Les collisions navire/terrain sont hors phase 1.

## Caméra et optimisation

Quatre vues ; rotation, zoom, déplacement à deux doigts / bouton droit, touches WASD/ZQSD et flèches tactiles maintenues. La caméra conserve huit mètres de garde au-dessus du terrain ; son point visé reste dans la baie. Elle peut traverser les bâtiments : c’est une caméra d’exploration sans collision physique.

Deux niveaux de détail : silhouettes, toitures et végétation conservées ; cheminées, lucarnes, corniches, rambardes et cabines masquées au-delà de 1 000 / 1 700 / 2 400 m selon le profil. Three.js élimine les groupes hors champ. Le terrain reste présent à distance ; bascule franche des détails sans fondu.

Budget observé en Chromium : environ 37–82 appels de rendu et 39 000–64 000 triangles en léger pour les quatre vues. Six textures GPU signalées, ressources internes comprises. Ces budgets ne prouvent pas les 30 FPS sur iPad ; Safari sur l’appareil cible reste à mesurer.

## Vérification et limites

Build strict et tests phase 0 conservés. Tests du couloir entre ports, connexion terre/eau des cales et absence d’auto-intersection des contours. Quatre vues × trois qualités rendues sans erreur WebGL/JavaScript ; échantillonnage de caméra sur la traversée. Captures contrôlées des ports depuis la mer, des forts et de la vue générale. Carte, commandes, réglages et redimensionnement vérifiés.

Contours anguleux, relief stylisé, architecture modulaire, réflexion sans bâtiments et écume approximative à la résolution de l’atlas. Ce document décrit le décor livré en phase 1 ; le navire et sa dynamique ajoutés ensuite sont documentés dans [PILOTING.md](PILOTING.md). Missions et marées restent hors périmètre.
