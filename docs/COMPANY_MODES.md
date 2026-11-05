# Modes de compagnie — intégration au jeu

## Accès et interface

Le menu initial propose deux modes : **Compagnie Corsaire** et **Brittany Ferries**. Chaque compagnie a son menu et conserve ses traversées. Le bouton **Compagnies**, disponible aussi depuis un service Corsaire en pause, permet de changer de mode.

Brittany Ferries occupe tout le viewport du jeu. Aucun dialogue, encadrement de fenêtre ni colonne permanente n'entoure sa scène 3D. Seuls les menus de pause et l'inspection du catalogue utilisent encore un dialogue. Le HUD reprend les composants, couleurs, typographie, icônes et positions Corsaire :

- En haut : identité, vitesse fond/cap/garde sous quille, carte, radar, instruments, réglages et menu.
- En bas à gauche : deux moteurs à sept crans, neutres individuels et collectif.
- En bas à droite : barre maintenue, remise au milieu et corne ; pause et accélération dans les outils de pied d'écran.
- Au centre inférieur : opérations de traversée, manifeste et progression ; en haut sur téléphone pour laisser les commandes accessibles.
- Vues extérieure/passerelle et choix des deux ailerons ; recentrage et zoom à droite.

Clavier partagé : ↑/↓ deux moteurs, Q/A bâbord, E/D tribord, ←/→ barre, X au milieu, Espace moteurs au neutre, C caméra. Échap ferme un panneau ou ouvre le menu Brittany Ferries. Les propulseurs d'étrave, l'énergie hybride, la recharge, les incidents et les équipes se trouvent dans **Instruments**. Les réglages météo, graphismes, sons, heure et remise à zéro restent disponibles.

## Architecture et conservation des sessions

`Game` choisit la compagnie et possède la session ferry. Le chargement du mode reste à la demande. `ChannelSession` expose pause, reprise et destruction ; le menu suspend la navigation et les commandes sans détruire la scène. Un changement de compagnie sauvegarde puis libère la scène ferry.

`CompanyMode` rend temporairement les éléments Corsaire masqués et inertes, sans les détruire. Il restaure leurs états précédents à la sortie, y compris le mode caméra exploration. Le moteur Corsaire reste en pause pendant le mode ferry et son rendu est suspendu. Une mission Corsaire ne progresse donc pas pendant une traversée Brittany Ferries.

`HelmControls` est le composant réellement partagé : mêmes boutons, répétition au maintien et clavier. Ses options de présentation fournissent les données du ferry et un point de montage distinct. Les identifiants sont préfixés et les recherches DOM limitées au poste concerné : aucune duplication d'ID ni pilotage simultané des deux bateaux. La configuration par défaut Corsaire est conservée.

`ChannelModeUI` et `ChannelMode.css` définissent les surimpressions du mode, avec les tokens existants. La simulation, les incidents, le trafic, la géographie et les formats de sauvegarde ne sont pas refondus. Les anciens styles de fenêtre de traversée sont retirés. La libération WebGL de phase 7 reste appliquée.

## Validation

- `npm test` : **196 tests réussis, aucun échec**.
- `npm run build` : TypeScript et Vite réussis, cible Safari 15 ; avertissement historique de taille du bundle principal conservé.
- Chromium réel : choix de compagnie ; canvas 1440×900 couvrant exactement le viewport ; absence de dialogue de jeu et d'ID dupliqué ; interface Corsaire masquée pendant le ferry et restaurée à la sortie.
- Commandes : Q/E donnent AV1 sur chaque moteur, toucher AV2 sur bâbord, barre maintenue, Espace/X au neutre, C passerelle/extérieure ; mêmes composants dans Corsaire et Brittany Ferries.
- Reprise : session ferry avec incident cabine et tâche commencée, sauvegarde, changement de compagnie, retour avec tâche conservée ; départ Portsmouth, nouvelle traversée et manifeste remis à zéro.
- Régression : moteur Corsaire AV1 retrouvé après aller-retour entre compagnies ; exploration conservée sans masquer les commandes ferry ; vraie mission Corsaire en embarquement suspendue puis retrouvée. Mode électrique et recharge à quai vérifiés dans le nouveau HUD.
- Captures examinées à 1440×900, 768×1024, 390×844 et 844×390 ; aucune exception JavaScript dans les parcours de contrôle finaux. Safari/iPad physique non testé.

Captures : [PC](images/brittany-mode-desktop.jpg), [tablette](images/brittany-mode-tablet.jpg), [téléphone](images/brittany-mode-mobile.jpg).

Cette modification concerne l'intégration et l'interface. Les limites de fidélité du navire, des ports, des véhicules et des passagers décrites dans l'audit de phase 7 restent applicables. Cartes et profondeurs fictives, inutilisables pour la navigation réelle. Pas de fusion dans develop ni de déploiement.
