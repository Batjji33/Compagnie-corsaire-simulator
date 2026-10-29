# Missions configurables

`definitions.ts` contient les ports, positions d'amarrage, points suggérés, passagers,
horaires, durées, météo, seuils de sécurité, critères d'accostage et commentaires.
Ajouter une définition dans `MISSIONS` la rend disponible dans le catalogue du menu.

`Mission.ts` est indépendant du DOM et de Three.js. Il reçoit une télémétrie issue
du navire à chaque pas physique, gère les objectifs, échecs et métriques, puis produit
un résultat. Il ne modifie jamais la position du navire.

`ui/Game.ts` coordonne menu, contrôle du navire, amarres, reprises et sauvegardes.
`world/MissionMarkers.ts` réutilise trois petits repères 3D.
`saves/GameStore.ts` stocke le profil et la mission courante dans IndexedDB.

Voir [le guide de jeu](../../docs/GAMEPLAY.md) pour les commandes et les règles.
