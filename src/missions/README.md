# Missions configurables

`definitions.ts` contient les ports, positions d'amarrage, points suggérés, passagers,
horaires, durées, météo, seuils de sécurité, critères d'accostage et commentaires.
Ajouter une définition dans `MISSIONS` la rend disponible dans le catalogue du menu.

Les règles d'amarrage communes sont dans `docking.ts` : rayon de 30 m, vitesse
strictement inférieure à 2 nd, validation immédiate sans contrainte de cap, de neutre
ou de stabilité. Omettre `docking` dans une nouvelle définition pour hériter de ces
règles ; un remplacement explicite `{distance, speedKnots}` reste possible pour une
mission particulière. Utiliser `dockingRules(definition)` pour le gameplay et tout
affichage associé : le cercle 3D, le briefing et le HUD partagent ainsi les seuils.
Les sauvegardes existantes, y compris leur ancien compteur `hold`, restent lisibles.

La protection des boudins est commune à toutes les missions et à la navigation libre :
`physics/ShoreContact.ts` distingue les quais des côtes et garde leurs forces physiques.
Seuls les appuis latéraux aux quais sont exclus des incidents, dégâts et pénalités.
Les contacts par les extrémités et les collisions avec les autres obstacles restent actifs.

`Mission.ts` est indépendant du DOM et de Three.js. Il reçoit une télémétrie issue
du navire à chaque pas physique, gère les objectifs, échecs et métriques, puis produit
un résultat. Il ne modifie jamais la position du navire.

`ui/Game.ts` coordonne menu, contrôle du navire, amarres, reprises et sauvegardes.
`world/MissionMarkers.ts` réutilise trois petits repères 3D.
`saves/GameStore.ts` stocke le profil et la mission courante dans IndexedDB.

## Service continu Saint-Malo ↔ Dinard

`FerryService.ts` compose les trajets `Mission` existants. Au terme du débarquement,
il enregistre le trajet, inverse la route et démarre un nouvel embarquement. Il ne
possède ni ne modifie la position du bateau. Seule la ligne `malo-dinard` utilise ce
mode dans `Game` ; les autres définitions gardent leur mission finie classique.

Les effectifs varient de façon déterministe entre 140 et 260 voyageurs, plafonnés
par la capacité du navire. Les escales durent 12 + 18 secondes au minimum, puis
attendent le largage manuel. Le mode continu désactive les échecs automatiques et
la pénalité de ponctualité ; les contacts, dégâts et effets de mer restent simulés.

`ServiceSnapshot` contient les compteurs cumulés et la qualité de l’approche en
cours ; l’état `MissionSnapshot` contient le trajet actuel. La direction dépend du
nombre de trajets terminés. Les anciennes parties actives sont reprises dans le
premier trajet du service sans modifier la position, le cap ou les passagers.
Le nombre de traversées et les passagers livrés sont comptés après débarquement
complet. Les historiques sont bornés à 100 entrées. Les trajets et le bilan de fin
ont des identifiants distincts et une comptabilité séparée pour éviter les doublons.

La satisfaction moyenne est pondérée par les voyageurs débarqués. La qualité des
accostages vaut 100 moins jusqu’à 20 points selon la vitesse au moment d’amarrer
et 20 points par contact d’approche ; les appuis latéraux protégés n’enlèvent rien.
Une absence de traversée terminée produit des moyennes absentes, pas une note fictive.

Voir [le guide de jeu](../../docs/GAMEPLAY.md) pour les commandes et les règles.
