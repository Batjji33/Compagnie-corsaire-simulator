# Corsaire de Saint-Malo

La vitesse de jeu est désormais de **19,5 nœuds**, à la demande du joueur. La valeur réelle de référence reste 12 nœuds. Ce réglage remplace le calibrage initial décrit ci-dessous : vitesse de pointe, traînée et limite de vitesse sont adaptées ensemble. Les nouveaux services retrouvent un créneau de 6 minutes ; les services sauvegardés conservent leur ancien créneau.

Choisir **Navigation libre** ou **Missions et excursions**, puis **Navire → Corsaire de Saint-Malo**. Le Corsaire d’Émeraude garde son modèle et ses réglages. Le choix est conservé localement ; une mission sauvegardée restaure son propre navire. Les anciennes sauvegardes sans identifiant reprennent avec l’Émeraude.

## Références consultées

- [Fiche officielle](https://compagniecorsaire.com/la-compagnie-dinard-saint-malo-bus-de-mer-croisieres-commentees/nos-bateaux/corsaire-de-saint-malo/) : catamaran polyester, 24 × 7,80 m, tirant d’eau 1,65 m, 245 passagers, 12 nd, 2 × MAN de 360 kW et un groupe électrogène, salon avec tables et pont supérieur découvert.
- Photos officielles : [trois quarts avant](https://compagniecorsaire.com/wp-content/uploads/2020/05/CDSM-2.jpg), [flanc et accès](https://compagniecorsaire.com/wp-content/uploads/2020/05/CDSM-3.jpg), [profil](https://compagniecorsaire.com/wp-content/uploads/2020/05/CDSM-1.jpg), [vue aérienne récente](https://compagniecorsaire.com/wp-content/uploads/2024/09/Corsaire-de-Saint-Malo-1-1920x1363.jpg), [salon](https://compagniecorsaire.com/wp-content/uploads/2024/09/CDSM-SALON5-R-1920x2174.jpg).
- [Photo publique de profil](https://www.bateaux-de-saint-malo.com/images/Corsaire%20de%20Saint-Malo.jpg), Bateaux de Saint-Malo : comparaison des proportions, vitrages, portes et poupe. Les anciennes photos montrent des bandes bleues ; la vue officielle récente montre la coque gris foncé retenue ici.

Photos utilisées pour l’étude uniquement, sans redistribution ni chargement distant dans le jeu. Le lettrage et le symbole Corsaire sont redessinés ; ce ne sont pas les fichiers de marque originaux.

## Modèle et simulation

`SaintMaloModel.ts` construit deux demi-coques distinctes, un tunnel ouvert à la flottaison, le pont de liaison surélevé, le salon avec baies et portes latérales, les deux façades inclinées, la timonerie avancée, le pont arrière découvert, les bancs, accès, garde-corps, défenses, radeaux, bouées, mât ajouré, radar et pavillon français. Le salon contient tables bois, sièges bleus, poteaux et comptoir. `Cockpit.ts` réutilise les commandes et données des instruments existants.

Les coefficients hydrodynamiques sont des réglages de jeu, pas des mesures du navire : inertie effective de 62 t, traînée latérale accrue, moteurs indépendants écartés de 5,6 m, inversion avec passage au neutre. La traînée est calibrée pour 12 nd et un plafond de vitesse vectorielle empêche de dépasser cette limite sous l’effet du vent ou des courants simulés. La flottabilité échantillonne quatre points sur les deux coques et atténue le roulis et la gîte en virage. Les collisions gardent une enveloppe pleine conservatrice, incluant le pont de liaison.

Caméras, tirant d’eau et sondeur, contacts de quai, évitements du trafic, sillage à deux traces principales et foule utilisent le profil sélectionné. L’audio procédural existant suit les mêmes moteurs et événements. Les charges sont plafonnées à 245 passagers ; les excursions et le service adaptent leurs vitesses et durées (créneau de 8 min 30 pour le Saint-Malo, 6 min conservées pour l’Émeraude). Le temps physique reste à 60 Hz.

Les géométries sont fusionnées par matériau et groupe. Primitives à faible nombre de segments, une texture de lettrage 1024 × 256 et deux petits écrans ; aucun modèle, photo ou reflet supplémentaire à charger. Au-delà de 130 m, sièges, tables, garde-corps fins et accessoires sont masqués, en conservant la silhouette et les vitrages. Les ressources GPU sont libérées lors du changement de navire ; la foule est détachée avant ce nettoyage puis rattachée au nouveau modèle.

## Limites

Reconstruction d’après photos, sans plans de chantier : sections immergées, position exacte des escaliers, aménagement des sièges et hauteurs sont estimés. Le cockpit est fonctionnel mais interprété ; moteurs et groupe électrogène restent des caractéristiques du profil, sans salle des machines visitable. Les calculs de vagues et de stabilité restent ceux d’un simulateur ludique.

La validation navigateur utilise Edge/Chromium et des dimensions tactiles iPad ; elle ne remplace pas un essai de performances sur Safari et sur l’iPad cible.

## Validation effectuée

- `npm run build` : TypeScript strict et production Vite réussis. Avertissement Vite sur la taille du bundle principal (843 ko, 230 ko gzip), sans erreur de compilation.
- `npm test` : **112 tests réussis**, dont quatre nouveaux tests sur le catamaran : accélération et plafond sous forces externes, dérive et propulsion différentielle, contacts et tirant d’eau, capacité et adaptation des missions/service/sauvegarde.
- Edge/Chromium avec WebGL : sélection dans le menu, navigation libre, caméras extérieure et passerelle, embarquement, reprise du service depuis IndexedDB dans un nouvel onglet, retour à l’Émeraude puis au Saint-Malo ; aucune exception JavaScript relevée.
- Boutons moteurs de l’interface : chaque moteur passe effectivement à AV1 (0,3). Simulation visuelle de 10 secondes avec vagues de 5,2 m : rotations finies, maxima observés d’environ 4,7° en roulis et tangage sur cet échantillon, sans prétendre couvrir toutes les mers et tous les caps.
- Rayons à la flottaison : aucune intersection dans le tunnel central ; intersections présentes sur chacune des deux demi-coques.
- Modèle détaillé seul : **9 742 triangles, 23 maillages**, hors cockpit et foule. Vérification du masquage des détails au-delà de 130 m et de leur retour à proximité. Scène de contrôle complète : environ 81 600 triangles et 103 appels de rendu, variables avec le trafic et la vue.
- Captures examinées à 1440 × 1000, 1024 × 768 avec émulation tactile, et 390 × 844. Captures et scripts ponctuels conservés dans `.qa/`, ignoré par Git. Aucun test matériel Safari/iPad ni mesure de FPS sur l’appareil cible.

## Fichiers concernés

- Ajouts : `src/ships/SaintMaloModel.ts`, `src/ships/Cockpit.ts`, `src/missions/vesselMission.ts`, `tests/saint-malo.test.ts`, ce document.
- Profils et assemblage : `src/ships/parameters.ts`, `src/ships/Vessel.ts`, `src/ships/README.md`.
- Physique et météo : `src/physics/VesselDynamics.ts`, `src/physics/ShoreContact.ts`, `src/weather/Marine.ts`.
- Rendu : `src/world/World.ts`, `src/world/VesselCamera.ts`, `src/world/PassengerView.ts`, `src/world/WakeView.ts`, `src/ships/WakeTrail.ts`.
- Intégration : `src/ui/Game.ts`, `src/ui/HelmControls.ts`, `src/saves/GameStore.ts`, `src/passengers/Passengers.ts`, `src/traffic/Traffic.ts`, `src/traffic/WaterTaxis.ts`, `src/missions/FerryService.ts`.

`CorsaireModel.ts`, le modèle du Corsaire d’Émeraude, est inchangé.
