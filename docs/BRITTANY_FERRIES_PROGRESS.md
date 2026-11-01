# Brittany Ferries — progression

## Périmètre
Phase 2 uniquement. Branche `feature/brittany-ferries`. Aucune modification de develop.

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
