# Brittany Ferries — progression

## Périmètre
Phases 2 à 4. Branche `feature/brittany-ferries`. Aucune modification de develop.

## Architecture examinée
- Three.js / TypeScript / Vite, une unité = un mètre.
- `ships/parameters.ts` et `Vessel.ts` sélectionnent les vedettes pilotables ; leurs paramètres alimentent physique, météo et contacts.
- `ShipGeometry.loft`, géométries fusionnées et matériaux partagés sont réutilisables.
- `Game.ts` porte le menu ; missions, sauvegardes et accostages restent dédiés aux navires existants.
- Le catamaran `saint-malo` doit conserver son identité. Le ferry sera `brittany-saint-malo`.

## Décisions
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
