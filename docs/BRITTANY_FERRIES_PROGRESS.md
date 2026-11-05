# Brittany Ferries — progression

## Périmètre
Phases 2 à 7. Branche `feature/brittany-ferries`. Aucune modification de develop. Le bilan actuel, y compris les éléments partiels, est dans [l'audit final](BRITTANY_FERRIES_FINAL_AUDIT.md).

## Architecture examinée initialement
- Three.js / TypeScript / Vite, une unité = un mètre.
- `ships/parameters.ts` et `Vessel.ts` sélectionnent les vedettes pilotables ; leurs paramètres alimentent physique, météo et contacts.
- `ShipGeometry.loft`, géométries fusionnées et matériaux partagés sont réutilisables.
- `Game.ts` porte le menu ; missions, sauvegardes et accostages restent dédiés aux navires existants.
- Le catamaran `saint-malo` doit conserver son identité. Le ferry sera `brittany-saint-malo`.

## Décisions initiales (phase 2)
Catalogue de compagnies léger, incluant les navires existants et un ferry en inspection seulement. Pas de coefficients physiques fictifs pour un navire de 195 m, pas de mission future. Inspection chargée à la demande depuis le menu existant, matériaux opaques, géométries fusionnées, textures locales et résolution plafonnée pour iPad.

## Références consultées le 1 novembre 2026
- [Dossier officiel du 8 février 2025](https://brittanyferriesnewsroom.com/wp-content/uploads/2025/02/08-02-25-Saint-Malo-Press-Pack-EN.pdf), p. 3 : 194,70 m, 27,80 m, tirant d'eau 6,60 m, 10 ponts, 1 290 passagers.
- [Photographie de profil publiée lors de la livraison](https://www.meretmarine.com/fr/marine-marchande/livraison-du-saint-malo-a-brittany-ferries), photo Brittany Ferries : coque blanche, bande marine basse, longue proue dégagée, passerelle avancée, hublots ronds, renfoncement des embarcations au milieu, cheminée reculée avec couronnement marine.
- [Autre publication photographique](https://www.meretmarine.com/fr/marine-marchande/le-saint-malo-de-brittany-ferries-commencera-finalement-ses-rotations-en-2025). Même point de vue général ; ne constitue pas une vérification indépendante de la poupe.
Les photographies sont des références de travail, non redistribuées.

## État
- [x] Analyse et branche dédiée.
- [x] Références officielles et examen photographique.
- [x] Modélisation, catalogue et inspection.
- [x] Comparaison des proportions, contrôles et build.

## Limites connues
Pas de plans de formes, coupes des garages ou relevé 3D disponibles. Les hauteurs, sections immergées, répartition exacte des fenêtres et équipements, logo redessiné et volumes intérieurs seront des approximations explicites. Ne pas présenter ce modèle comme une réplique certifiée. Aucun système de véhicules ni phase suivante.

## Réalisation
- [x] Catalogue de compagnies, ferry distinct des Corsaire, inspection seulement.
- [x] Coque à 18 stations et 12 points par section, bulbe, étrave inclinée, superstructures profilées, passerelle, hublots, cheminée reculée, mâts, rails, renfoncements et canots, livrée locale.
- [x] Garages, réservations passagers/cabines et rampes à pivots indépendants. Volumes approximatifs visibles en coupe.
- [x] Menu principal → Brittany Ferries · Saint-Malo : cinq vues, orbite tactile, zoom, coupe et rampes.

## Comparaison des proportions
| Mesure | Référence | Modèle |
| --- | --- | --- |
| Longueur | 194,70 m officielle | 194,699997 m mesurés |
| Largeur | 27,80 m officielle | Coque 27,80 m, enveloppe 27,82 m avec marquages rapportés |
| Rapport longueur / largeur | 7,004 | 7,004 pour la coque |
| Tirant d'eau | 6,60 m officiel | Fond à y = -6,60 m |
| Échelle Corsaire | Émeraude 26,3 m ; catamaran 24 m | 7,40 et 8,11 fois leurs longueurs |
| Passerelle depuis la proue | Photo : environ 12–16 % de L | Environ 12,5 % |
| Toit des superstructures | Photo : environ 70 % de L | 136 m, soit 69,9 % |
| Centre cheminée depuis la proue | Photo : environ 70–76 % de L | 72,9 % |

Comparaison visuelle de profil et perspective effectuée. Corrections : renfoncements ouverts autour des canots, étrave inclinée, planchers cachés en vue extérieure, cadrage rapproché et contraste des boutons. Les proportions verticales sont estimées. Les deux photographies montrent un angle similaire : aucune validation indépendante de la poupe. Logo redessiné, fenêtres, radars et embarcations simplifiés. La superstructure avant et les intérieurs restent des approximations. Ce modèle d'étude ne constitue pas une réplique de précision.

## Contrôles
- Installation des dépendances verrouillées réussie. Premier build impossible faute de dépendances, puis `spawn EPERM` Windows résolu par exécution autorisée.
- `npm run build` réussi : TypeScript et Vite, cible Safari 15. Avertissement non bloquant du bundle principal > 650 kB ; pas de refonte globale du découpage.
- `npm test` : 148 réussis, aucun échec.
- Navigateur Chromium réel via CDP : ouverture depuis le menu, vues profil/perspective, coupe, rampes, fermeture et retour au menu vérifiés. Captures aux largeurs 1440, 768 et 390 px, examinées après corrections.
- Modèle complet : 12 200 triangles, 31 meshes, huit textures locales 1024×128, matériaux opaques, géométries fusionnées. DPR limité à 1,5. Aucune ombre ou postproduction. Inspection rendue uniquement sur interaction ; rendu de la baie suspendu ; ressources libérées à la fermeture.
- Safari sur iPad physique indisponible : compatibilité de build vérifiée, fluidité et contexte WebGL sur appareil non validés. Aucun FPS iPad annoncé.

## État final
Phase 2 livrée comme modèle d'étude inspectable à fidélité partielle. Plans de formes, garages détaillés et couverture photographique multi-angles restent nécessaires pour une reproduction plus fidèle. Aucune phase suivante, mission ferry, physique de ferry ou circulation automobile développée.

Captures du modèle : [perspective](images/brittany-saint-malo.jpg), [profil](images/brittany-saint-malo-profile.jpg).

## Phase 3 — Géographie et traversée de la Manche

- [x] Analyse des coordonnées locales, terrains, atlas marin, ports, caméra et contacts existants.
- [x] Fond régional Natural Earth, sources portuaires officielles, limites et provenance documentées dans [CHANNEL.md](CHANNEL.md).
- [x] Naye enrichi en surcouche ; Portsmouth, entrée, Portsea/Gosport, terminal international, quais, base portuaire et repères principaux.
- [x] Jersey, Guernesey, Sercq, Aurigny, Cotentin et île de Wight positionnés dans la projection régionale ; aucune escale imposée.
- [x] Route continue d'environ 294 km, réservations grands ferries, reconnaissance guidée et conduite manuelle provisoire.
- [x] Carte de la Manche, radar côtier, GPS et collisions cohérents dans cette reconnaissance ; zones et sauvegardes Corsaire préservées.
- [x] Origine de rendu flottante, compensation des vagues, chargement avec hystérésis au-delà de la brume et libération des ressources.
- [x] Approches, empreinte complète du ferry, parcours complet, collisions, continuité et chargement aller/retour vérifiés.

Décisions : aucun changement global des distances Corsaire ; extension accessible depuis son propre écran de reconnaissance, basée sur les composants existants. Calibration manuelle de ferry provisoire seulement. Pas de système de véhicules, de mission commerciale ni de gestion portuaire ajoutés.

Limites : géographie Corsaire locale approximative conservée, fond régional à petite échelle (1:10 millions), ports et relief interprétés, profondeurs et balisage fictifs. Requête Overpass refusée (HTTP 406), aucune donnée de cette requête utilisée. iPad physique indisponible. L'interface et la documentation indiquent explicitement que les cartes ne servent pas à la navigation réelle.

Validation finale phase 3 : `npm run build` réussi (TypeScript + Vite, cible Safari 15) ; `npm test` : **156 réussis, 0 échec**. Avertissement non bloquant du bundle principal > 650 kB conservé. Module de reconnaissance chargé à la demande : environ 28 kB minifiés / 11,4 kB gzip. `git diff --check` sans erreur. Captures et détails de reproduction dans [CHANNEL.md](CHANNEL.md).

## Phase 4 — Physique, propulsion hybride et passerelle (5 novembre 2026)

- [x] `FerryDynamics` : calibration dédiée au ferry, inertie de grand navire, deux moteurs indépendants, réponse progressive, inversion différée, traînées et gouvernail limité en vitesse. Physique Corsaire réutilisée sans modifier ses constantes.
- [x] Réponse au vent, courant et houle ; flottabilité amortie du grand ferry ; propulseurs d'étrave progressifs et moins efficaces avec l'erre.
- [x] `HybridPlant` : modes électrique, GNL et combiné ; suivi kWh/kg, réserve de carburant, puissance limitée par les sources, transition thermique, épuisement et recharge conditionnelle à quai.
- [x] Caractéristiques publiques vérifiées : moteurs thermiques 2 × 13 740 kW, électriques 2 × 4 800 kW, batterie 11,2 MWh, propulseurs 2 × 2 400 + 600 kW. Paramètres énergétiques non publiés identifiés comme estimations.
- [x] `FerryBridge` : passerelle panoramique inspirée d'une photographie réelle, poste central et deux ailerons, consoles et écrans utilisant les données du simulateur. Changement de poste en marche sans réinitialisation.
- [x] Radar côtier, carte, GPS, cap, vitesse fond/dans l'eau, sondeur de jeu, garde sous quille, barre, rotation et données moteurs/énergie.
- [x] Commandes séparées bâbord/tribord, gouvernail et étrave ; sélecteur de propulsion et conditions de scénario ; retour au neutre ; verrouillage immédiat pendant la charge.
- [x] Repères typés pour de futures caméras d'accostage ; aucune caméra vidéo ni phase suivante développée.
- [x] Tests de manœuvre à basse vitesse, croisière, freinage/giration, modes énergétiques, panne de sources, recharge et continuité des trajectoires.

### Décisions et limites
Le mode accessible depuis le menu commence désormais au pilotage manuel en temps réel. L'ancien parcours guidé subsiste pour les tests de géographie. La centrale est un bilan énergétique agrégé : groupes GNL, convertisseurs et transferts entre arbres ne sont pas simulés composant par composant. Les coefficients de coque, rendements, consommation, masse déplacée estimée et puissance de quai sont documentés dans [FERRY_PILOTING.md](FERRY_PILOTING.md). Pas de données d'essais constructeur pour certifier le rayon ou l'arrêt. L'implantation de la passerelle reste interprétée sans plans.

Le courant de scénario intervient dans la vitesse fond et les conditions de raccordement. Les contacts arrêtent le navire avant l'obstacle, sans déformation de coque. Les cartes/profondeurs restent fictives. Safari/iPad physique n'est pas disponible pour validation ; l'ergonomie tactile est vérifiée par émulation en navigateur, sans prétendre à une certification sur appareil.

### Contrôle visuel et commandes
Captures examinées aux formats 1440 × 900, 768 × 1024 et 390 × 844. Poste central et deux ailerons, retour au menu, charge effective, verrouillage/déverrouillage contrôlés. Test tactile : curseur bâbord passé à 0,65 ; clavier : flèche droite à 0,70. Les changements de poste conservent commandes et navigation. Corrections après examen : dégagement des vues latérales, position centrale, initialisation des textures cartographiques avant la première image et libération immédiate des commandes au débranchement.

L'arrêt précédent venait d'une indisponibilité du service de revue automatique (quota), qui empêchait un dernier lancement de navigateur. La reprise du 5 novembre a permis les vérifications restantes.

Résultat final phase 4 : **`npm run build` réussi et 165 tests réussis, aucun échec**. Avertissement non bloquant du bundle principal > 650 kB conservé. Le module de pilotage et passerelle est chargé à la demande (~40 kB minifiés, ~15,5 kB gzip). Aucune dépendance ajoutée. Catalogue Brittany Ferries marqué pilotable ; les missions Corsaire gardent leur catalogue historique.

## Phase 5 — Trafic maritime IA

- [x] Analyse des commits des phases 2–4, du trafic, des modèles, de la corne et des réservations existants.
- [x] Flotte régionale variée et à l'échelle commune : grands cargos, porte-conteneurs de 310 m, ferries, voiliers, plaisanciers ; deux services britanniques interprétés.
- [x] Routes continues vérifiées, vitesses, inertie et rotation par catégorie, prévision des rapprochements et distinction entre maintien de route et manœuvre.
- [x] Réactions à la corne différenciées, synthèse et volumes existants réutilisés ; contacts des coques complètes, radar et carte mis à jour.
- [x] Réservations de quais et services Corsaire conservés ; moteur `Berths` réutilisé pour les postes du grand ferry.
- [x] Horloge commune ×1/×2/×4/×8 ; simulation distante simplifiée, densité réglable et LOD de silhouette pour les grands navires.
- [x] Tests de croisement, face à face, contacts, ports, temps accéléré et navigation prolongée ; examen en navigateur.

Décision : la Manche reçoit `ChannelTraffic`, en partageant types, prévision, rendu, son et réservations ; le comportement des missions Corsaire demeure celui du moteur historique. Les circuits de trafic ambiant et services britanniques sont fictifs. Limites et provenance : [CHANNEL_TRAFFIC.md](CHANNEL_TRAFFIC.md). Un chevauchement initial entre deux agents a été détecté par le test prolongé puis corrigé par la sélection de positions initiales séparées. Aucun blocage sur dix minutes dans le scénario de validation corrigé. Les cas d'urgence gardent un arrêt anti-pénétration, sans simuler une déformation de coque.

La phase suivante n'est pas commencée ; aucune fusion dans develop et aucun déploiement.

Validation finale phase 5 : `npm run build` réussi ; **174 tests réussis, 0 échec**, dont les missions et accostages Corsaire. Avertissement non bloquant du bundle principal > 650 kB conservé. Module Manche chargé à la demande : environ 47,2 kB minifiés / 18,2 kB gzip. `git diff --check` sans erreur. Aucun test Safari/iPad physique et aucun déploiement.

## Phase 6 — Incidents dynamiques et équipage

- [x] Analyse du trafic de phase 5, de l'énergie, de l'horloge et du suivi existants.
- [x] Catalogue modulaire de onze catégories, contexte météo/position/trafic/état du ferry, incompatibilités, rareté des événements graves et périodes calmes ; fréquence et difficulté réglables.
- [x] Interactions propres à chaque catégorie, choix d'équipes, conditions de manœuvre et étapes ; aucune commande universelle de résolution.
- [x] Équipes technique, navigation et assistance passagers ; affectations exclusives, délais, rappels, issues achevées/partielles/échouées et soutien extérieur évitant un blocage permanent.
- [x] Capacités moteur et électrique réduites réellement, météo d'un grain progressive, recharge empêchée au terminal perturbé, retard/tension/suivis médicaux/cabines persistants.
- [x] Animations symboliques non graphiques : équipes, secteurs, fumée, hélicoptère, marqueur et assistance. Les urgences sont des scénarios fictifs de coordination.
- [x] Panneau HUD repliable, réglages secondaires, journal, progression et sauvegarde locale de la traversée ; reprise en pause et nouvelle session explicite.
- [x] Scénarios reproductibles et tests d'incidents simultanés, ressources, conséquences, sauvegardes invalides et horloge ×1/×2/×4/×8.

Décisions : moteur indépendant du DOM et définitions extensibles ; intégration dans les sous-pas existants du ferry. Les missions Corsaire gardent leurs systèmes. La persistance du ferry utilise un emplacement local séparé pour chaque point de départ, sans modifier les sauvegardes Corsaire. Limites, durées et conséquences : [INCIDENTS.md](INCIDENTS.md).

Contrôle navigateur : exercice cabine, délégation, progression ×8, fermeture/reprise avec tâche conservée, remise à zéro ; captures 1440/768/390 px examinées. Corrections : estimation des choix recalculée après changement de difficulté, réévaluation des conditions d'approche du marqueur et ouverture d'une nouvelle traversée après fermeture effective de l'ancienne. Safari/iPad physique non testé. Aucun conseil médical ou protocole opérationnel réel n'est fourni.

Aucune phase suivante commencée, aucune fusion dans develop, aucun déploiement.

Validation finale phase 6 : `npm run build` réussi ; **185 tests réussis, 0 échec**, dont les scénarios d'incidents et les régressions Corsaire. `git diff --check` sans erreur. Avertissement non bloquant du bundle principal > 650 kB conservé ; module Manche chargé à la demande ~73 kB minifiés / ~26,7 kB gzip. Aucune dépendance ajoutée. Chaque nouvelle traversée reçoit une graine locale différente ; sa sauvegarde conserve le générateur pour la reprise.

## Phase 7 — Finition et validation (5 novembre 2026)

- [x] Cahier des charges, architecture, historique et réalisations des phases 2–6 audités.
- [x] Deux départs réels, service portuaire complet, progression manuelle, amarrage sans déplacement, retour conservant énergie et conséquences.
- [x] Rampes progressives, ouvertures arrière, flux représentatifs de passagers/véhicules à l'échelle ; sauvegarde enrichie et événements adaptés au manifeste.
- [x] Sillage/écume du grand ferry, façade vitrée, cycle jour/nuit, éclairage et audio reliés à la navigation.
- [x] HUD tactile réorganisé, commandes visibles, trois postes, qualité graphique adaptative, libération des instances et correction d'une rétention des contextes Three r186.
- [x] 196 tests réussis, 0 échec ; build TypeScript/Vite Safari 15 réussi, avertissement de bundle conservé ; aucun ajout de dépendance.
- [x] Contrôles Chromium des départs/arrivées depuis états de test, reprise, modes, postes, gestes et clavier, audio, inspection, retour Corsaire et formats 1440/768/390 px ; aucune exception JavaScript dans les scénarios finaux.
- [x] Mesures PC : ~30 FPS observés, 25–88 appels de dessin ; ouverture locale ~1,15 s ; réouvertures et tas JS contrôlés après correction. Aucun résultat iPad revendiqué.

Bilan détaillé distinguant terminé, partiel, non réalisé et limites : [BRITTANY_FERRIES_FINAL_AUDIT.md](BRITTANY_FERRIES_FINAL_AUDIT.md). Architecture et utilisation : [FERRY_PILOTING.md](FERRY_PILOTING.md).

La fidélité du modèle et des ports reste partielle ; véhicules et passagers sont des flux agrégés représentatifs, sans circulation individuelle complète. Plans détaillés et références supplémentaires manquants. Safari/iPad physique et traversées manuelles intégrales de plusieurs heures non testés. Les essais géométriques et états de destination injectés ne doivent pas être présentés comme de tels essais. Version prête à être évaluée avec ces réserves, sans certification professionnelle ni donnée utilisable pour la navigation réelle. Aucune fusion dans develop, aucune publication et aucun déploiement.

## Intégration comme mode de jeu (après phase 7)

- [x] Choix initial Compagnie Corsaire / Brittany Ferries, menus propres et changement de compagnie accessible depuis un service en pause.
- [x] Brittany Ferries dans le viewport complet, avec HUD Corsaire partagé ; suppression de la fenêtre de traversée.
- [x] Même composant de moteurs/barre, boutons, clavier, typographie, icônes et emplacements ; données et identifiants isolés par poste.
- [x] Sessions et sauvegardes conservées, mission Corsaire suspendue pendant Brittany Ferries, restauration de l'interface et de l'exploration.
- [x] Énergie hybride, propulseurs, carte/radar, ailerons, équipage, incidents et réglages toujours accessibles.
- [x] 196 tests réussis, build réussi et contrôles Chromium des deux modes, des changements de compagnie, des gestes et des reprises. Captures PC/tablette/téléphone/paysage examinées ; iPad physique non testé.

Architecture, commandes et résultats : [COMPANY_MODES.md](COMPANY_MODES.md). Les captures et descriptions d'interface de phase 7 ci-dessus sont historiques ; le mode plein écran les remplace. Aucune fusion dans develop ni aucun déploiement.
