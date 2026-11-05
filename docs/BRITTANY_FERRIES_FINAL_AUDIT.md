# Audit final Brittany Ferries — phase 7

Évaluation du 5 novembre 2026 sur `feature/brittany-ferries`, après relecture des demandes des phases 2–7, du suivi et des commits `3ab0a82` à `4b62e39`. Version jouable pour évaluation ; fidélité visuelle partielle. Une compilation réussie ne vaut ni reproduction exhaustive ni validation iPad.

## Corrections livrées

- Véritables départs des deux ports ; cycle préparation, embarquement, fermeture des rampes, départ, navigation, amarrage, débarquement et retour. Position, énergie, horloge et conséquences conservées au retour, sans téléportation.
- Progression de route calculée en pilotage manuel dans les deux sens. Amarrage conditionné par position, cap, vitesses, rotation, commandes neutres, disponibilité et accès au poste ; immobilisation sans recalage de position. Réservation du joueur corrigée et recharge possible lorsque le navire est amarré malgré le courant.
- Rampes progressives, ouvertures dans le tableau arrière et planchers de garage. Flux représentatifs raccordés au terminal d'arrivée, et non au départ.
- Façade avant vitrée affinée, vitrages éclairés et feux nocturnes symboliques. Sillage persistant à l'échelle du ferry ; ancienne longueur Corsaire corrigée sur l'axe Z ; écume adaptée aux dimensions. Cycle jour/nuit et visibilité météo ; direction lumineuse de l'eau indépendante de celle du monde Corsaire.
- Ambiances moteur, mer, vent et port alimentées en navigation ; moteur atténué en électrique, alertes et annonces facultatives. Activation par geste, suspension en pause et fermeture du contexte audio.
- Vue 3D dominante, instruments défilants et tiroir sur téléphone ; commandes toujours accessibles, verrouillées à quai ou en charge. Corne conservée dans les commandes principales.
- Sauvegarde enrichie : service, manifeste, transferts, heure, temps, confort, propulseur effectif et temps de physique. Anciennes sauvegardes reprises en pilotage libre. Incidents passagers spontanés exclus à manifeste vide.
- Qualité automatique/manuelle, DPR plafonné, maillage d'eau et détails adaptatifs, cache des limites terrestres, suppression de quais dupliqués et libération des instances déchargées.
- Rétention mémoire identifiée au snapshot : la DFG LUT partagée de Three r186 conservait les anciens contextes et dialogues. `RendererLifetime` la libère à la fermeture des vues ferry ; le rendu Corsaire la recharge ensuite. Hook public `onBeforeCompile`, sans modification des dépendances. À recontrôler lors d'une mise à niveau de Three.

## Fonctionnalités terminées dans le périmètre du jeu

| Fonction | Résultat vérifié |
| --- | --- |
| Catalogue, inspection et échelle | Ferry distinct du catamaran Corsaire ; cinq vues, coupe, rampes ; enveloppe fermée 194,699997 × 27,820000 m et fond à −6,600000 m. Coque nominale de 27,80 m ; marquages rapportés dans l'enveloppe |
| Service | Manifeste de jeu 420 passagers / 80 véhicules, transferts, interverrouillages, amarrage, fin et retour persistants |
| Pilotage et énergie | Deux moteurs, gouvernail, étrave, inertie dédiée, trois modes, consommation, sources épuisées et recharge conditionnelle |
| Navigation | Coordonnées métriques, route continue ~294,4 km sans escale imposée, carte/radar/GPS, contacts de coque et chargement progressif |
| Trafic et incidents | Catégories variées, cargos de 310 m, anticipations et corne ; onze catégories d'incidents, équipes, étapes, issues et conséquences persistantes ; horloge commune |
| Interface et audio | Données réelles du simulateur, trois postes, tactile/clavier PC, ambiance procédurale et libération des ressources |
| Préservation Corsaire | Suite historique incluse dans les tests ; retour au service Saint-Malo–Dinard et contexte WebGL actif vérifiés après fermeture du ferry |

« Terminé » signifie fonctionnel dans le simulateur, sous les limites ci-dessous.

## Fonctionnalités partiellement réalisées

- **Fidélité du navire** : dimensions, silhouette, coque blanche, bande marine, hublots, renfoncements des canots, passerelle et cheminée reculée reconnaissables. Superstructures ~70 % de la longueur, cheminée vers 73 %. Hauteurs, façades, poupe, équipements et logo interprétés. Pas de plans de formes ni de couverture photographique suffisante pour certifier une réplique ; les références de profil ne valident pas indépendamment la poupe.
- **Ports et paysages** : Naye, digues historiques, Portsmouth, accès, terminal et repères principaux ; îles et côtes positionnées dans la projection. Ports schématiques, côte Natural Earth au 1:10 millions, relief simplifié, baie Corsaire localement approximative conservée. Raccordements de chargement interprétés, sans relevé Ro-Ro réel.
- **Véhicules/passagers** : manifeste fonctionnel ; 24 voitures et 18 silhouettes animées en instances représentent les flux agrégés. Voitures de 4,5 × 1,8 m et personnes de 1,7 m. Boucles, virages de chemin et visibilité simplifiés ; aucune simulation individuelle de tous les voyageurs et véhicules.
- **Intérieurs/animations** : garages et réservations inspectables, rampes et animations symboliques d'incidents ; espaces passagers et équipements non reproduits intégralement.
- **Physique/ambiance** : coefficients et rendements estimés lorsque les données constructeur manquent, courant uniforme sans marée locale, contacts sans déformation, IA de jeu. Vagues, sillage, lumière et sons procéduraux ; pas d'enregistrements authentiques ni de secteurs de feux certifiés.

## Fonctionnalités non réalisées

- Circulation automobile individuelle complète : réseau routier portuaire, files, affectation des places et déplacements autonomes sur plusieurs garages.
- Déplacements individuels complets des passagers jusqu'aux espaces réels ; intérieurs et ensemble des éléments mobiles détaillés sur plans.

Les caméras vidéo d'accostage restent des repères d'architecture préparés en phase 4 ; leur développement n'a pas été ajouté.

## Tests effectués et résultats

- **`npm test` : 196 réussis, 0 échec, 0 ignoré**, environ 14,6 s. Tous les tests disponibles : anciennes missions, physique, énergie, trafic, incidents, sauvegardes, accélérations et services ferry.
- **`npm run build` réussi**, TypeScript et Vite, cible Safari 15. Avertissement non bloquant du bundle principal ~864 kB minifiés / 237 kB gzip conservé ; module Manche chargé à la demande ~93 kB / 33 kB gzip. Aucune dépendance ajoutée.
- Deux cycles de service automatisés : embarquement et fermeture complets, départ refusé en charge, départ, amarrages invalides refusés, amarrage sans déplacement, débarquement complet et retour conservant énergie/incidents. **Positions de destination injectées comme états de test.**
- Route entière : empreinte échantillonnée sur les segments aller/retour, progression et continuité ; reconnaissance guidée historique jusqu'à Portsmouth. Physique, approches, giration/freinage, consommation, croisements, collisions, évitements, interventions simultanées et horloges ×1/×2/×4/×8 couverts par les tests.
- Chromium réel : embarquement ×8, pause et reprise sauvegardée, départ depuis état de test, amarrages et débuts de débarquement aux deux ports, modes, postes, corne, nuit et sillage. Aucune exception JavaScript dans les scénarios finaux.
- Toucher bâbord à **0,65**, flèche clavier à **0,70**, valeur conservée entre postes. Audio `running → suspended → closed`, avec gestes et activation utilisateur requise dans le navigateur de contrôle. Sortie sonore coupée par l'outil : qualité d'écoute non certifiée.
- Captures 1440×900, 768×1024 et 390×844 examinées ; pas de débordement horizontal, commandes hors du canvas, tiroir défilant. Inspection cinq vues/coupe/rampes ; retour Corsaire avec embarquement 13/180 et contexte WebGL actif.
- Six réouvertures en développement après correction : écouteurs constants à **186**, tas JS **12,87 → 13,61 Mio**, derniers échantillons stabilisés. Avant correction : **186 → 221** écouteurs et **12,54 → 21,94 Mio**. Les dialogues retenus ont été identifiés au snapshot.
- `git diff --check` sans erreur de whitespace. Branche dédiée conservée ; aucune fusion ni publication.

**Aucune traversée complète aller ou retour n'a été pilotée manuellement pendant toute sa durée.** Les parcours géométriques et les états de test ne remplacent pas une campagne de jeu prolongée de plusieurs heures.

## Mesures de performance et limites techniques

Chromium headless Windows, ANGLE Intel UHD / Direct3D11, build local, DPR 1, qualité équilibrée, rendu plafonné à environ 30 FPS. Échantillons courts de 14 s par scène ; aucune garantie des temps GPU ni extrapolation à un autre appareil.

| Scène | Format | FPS observés | Appels de dessin |
| --- | --- | --- | --- |
| Naye | 1440×900 | ~30 | 88 |
| Portsmouth | 768×1024 | ~30 | 47 |
| Large ×8 | 768×1024 | ~30 | 25 |

Ouverture locale du module et premier affichage des instruments : **~1,15 s**. Tas JS échantillonné : **~10–26 Mio**, variable avec le GC ; **~7,60–7,74 Mio** après fermetures/réouvertures en production avec GC demandé. Il ne s'agit ni de mémoire totale ni de VRAM. Rapport : [mesures](validation/brittany-performance.json).

Géométries fusionnées, instancing, LOD, trafic distant simplifié, chargement hors brume avec hystérésis, origine flottante, DPR limité et instruments à 5 Hz conservés. L'adaptation automatique peut seulement réduire la qualité. Le bundle principal reste volumineux ; aucun découpage général n'a été entrepris.

**Safari/iPad physique indisponible** : objectif 30 FPS stables sur iPad classique, mémoire totale, audio audible, multi-touch et perte de contexte sur cet appareil non validés. L'émulation tactile Chromium et la compilation Safari 15 ne constituent pas une validation Safari réelle.

## Références et évaluation avant publication

Dimensions publiques : [dossier officiel Saint-Malo](https://brittanyferriesnewsroom.com/wp-content/uploads/2025/02/08-02-25-Saint-Malo-Press-Pack-EN.pdf). Comparaisons photographiques et proportions : [suivi](BRITTANY_FERRIES_PROGRESS.md). Provenance géographique : [CHANNEL.md](CHANNEL.md). Architecture et conduite : [FERRY_PILOTING.md](FERRY_PILOTING.md). Trafic et événements : [CHANNEL_TRAFFIC.md](CHANNEL_TRAFFIC.md), [INCIDENTS.md](INCIDENTS.md).

Captures : [traversée](images/brittany-final-voyage.jpg), [passerelle](images/brittany-final-bridge.jpg), [débarquement](images/brittany-final-unloading.jpg), [nuit](images/brittany-final-night.jpg), [tablette](images/brittany-final-tablet.jpg), [téléphone](images/brittany-final-mobile.jpg).

Avant publication : traversées manuelles longues dans les deux sens, essais Safari/iPad physique, références multi-angles et relevés plus précis des ports et intérieurs. **Cartes, balisage, profondeurs et scénarios sont inutilisables pour la navigation réelle.** Aucun déploiement automatique.
