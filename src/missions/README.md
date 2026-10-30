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

Voir [le guide de jeu](../../docs/GAMEPLAY.md) pour les commandes et les règles.
