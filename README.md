# Compagnie Corsaire Simulator — jeu de navigation

Jeu maritime web local dans une baie Saint-Malo–Dinard simplifiée : navigation libre, mission de transport de passagers, météo évolutive, trafic autonome et excursions commentées. Scène procédurale sans ressource distante, sans API ni service payant. Développement sur `develop`. Voir [le dossier environnement](docs/ENVIRONMENT.md) pour les sources, les choix fictifs, les budgets et les limites.

Le Corsaire d’Émeraude est pilotable avec deux moteurs indépendants, barre progressive, inertie, marche arrière et caméras extérieure/cockpit. Le menu propose la navigation libre et un service continu Saint-Malo ↔ Dinard : rotations illimitées, voyageurs renouvelés, départs manuels et bilan à la fin du service. Progression, service en cours et paramètres sont conservés dans IndexedDB. Voir [le guide du jeu](docs/GAMEPLAY.md), [les conditions maritimes](docs/MARITIME.md) et [les commandes de pilotage](docs/PILOTING.md).

La phase 5 ajoute voiliers, plaisance, ferries et vedettes avec évitements et échos
radar, une foule 3D instanciée suivant les étapes de mission, la satisfaction des
passagers et sept commentaires français éditables. **Excursion** ouvre le panneau
de commentaires et de volumes, **Son : non / oui** active l'ambiance procédurale.
Le texte reste disponible sans voix française. Voir [le guide d'immersion](docs/IMMERSION.md)
et [les crédits audio et touristiques](public/assets/AUDIO-CREDITS.md).

## Démarrer

Node.js récent (22.18+ conseillé pour les tests TypeScript natifs), npm et navigateur WebGL 2.

```sh
npm ci
npm run dev
```

Ouvrir `http://localhost:5173`. Sur l’iPad connecté au même réseau local, utiliser l’adresse Network affichée par Vite (le pare-feu du PC doit autoriser ce serveur). L’application n’a pas besoin d’Internet une fois ses fichiers servis. Ce n’est pas encore une PWA installable ou un cache hors ligne.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`dist/` contient le site statique distribuable ; les chemins relatifs permettent un hébergement en sous-dossier. La cible JavaScript est Safari 15 ; la compatibilité effective dépend aussi de WebGL 2 et du GPU. Vérifier sur le modèle d’iPad visé.

Pour publier le site statique : [déploiement gratuit sur Cloudflare Pages via GitHub](docs/DEPLOYMENT.md).

## Commandes

Au départ, monter les deux manettes progressivement. Flèches haut/bas : moteurs ensemble ; Q/A : bâbord ; E/D : tribord ; gauche/droite : barre ; X : au milieu ; Espace : neutre ; C : caméra. Les commandes restent en position après relâchement. Le neutre laisse le bateau sur son erre. Les commandes ci-dessous restent disponibles pour la caméra et l’exploration.

- Glisser un doigt ou le bouton gauche de la souris : tourner la caméra.
- Pincer à deux doigts, utiliser la molette ou les boutons +/− : zoomer.
- Glisser à deux doigts ou au bouton droit : déplacer la caméra. Maintenir les flèches tactiles pour avancer, reculer ou se déplacer latéralement.
- Sélectionner Saint-Malo, Dinard, toute la baie ou les forts ; ouvrir Carte pour les repères et le tracé schématique.
- Recentrer : revenir à la vue extérieure du navire sans déplacer le bateau.
- En exploration libre, après focus sur la scène : flèches pour tourner, WASD/ZQSD pour déplacer, +/− pour zoomer, R pour revenir au bateau.
- Menu ou Pause : suspendre la simulation, reprendre, redémarrer ou revenir au dernier point sûr.
- Réglages : qualité graphique et compteur FPS réel, enregistrés localement si le stockage est disponible.

## Architecture

| Dossier / fichier | Responsabilité |
| --- | --- |
| `src/config.ts` | Cadences, caméra, mer, soleil, profils graphiques |
| `src/core/` | Horloge fixe, ordonnanceur de rendu, erreurs |
| `src/world/` | Scène, ciel, mer GPU, caméra, chargement GLB/glTF à la demande |
| `src/weather/` | Météo évolutive locale, marée, profondeur, éclairage et dangers |
| `src/instruments/` | Mesure des images réellement rendues |
| `src/ui/` et `src/style.css` | Interface DOM, commandes tactiles et adaptation de l’écran |
| `src/saves/` | Préférences versionnées et validation des valeurs stockées |
| `src/ships/`, `src/physics/` | Navire, modèle 3D, propulsion, hydrodynamique et collisions |
| `src/missions/` | Définitions de trajets, objectifs, critères d'accostage et notation |
| `public/assets/` | Emplacement des futures ressources et de leurs licences |
| `tests/` | Indépendance de cadence et protection contre le rattrapage excessif |

La simulation avance à 60 Hz par accumulation du temps réel ; le rendu est plafonné séparément à 30 ou 60 FPS. Au maximum huit pas sont rattrapés par image ; l’excédent est abandonné après un blocage. Le temps simulé est donc ralenti sous surcharge extrême. Les onglets masqués arrêtent la boucle, sans rattrapage au retour. Les futurs systèmes s’insèrent dans le callback fixe de `main.ts` ; la mer utilise le temps interpolé et un shader GPU. Les ressources GPU et événements sont nettoyés lors des remplacements de modules Vite.

## Budget graphique

| Profil | Ratio de pixels maximal | Grille mer | Cadence maximale |
| --- | --- | --- | --- |
| Légère (défaut) | 1 | 64 × 64 | 30 FPS |
| Équilibrée | 1,5 | 128 × 128 | 30 FPS |
| Élevée | 2 | 192 × 192 | 60 FPS |

Pas de post-traitement, d’ombres ni de reflet rendu dans une seconde passe. Quatre textures procédurales de 256 px et un atlas de côte de 512 px, géométries instanciées et détails limités par distance. Le ciel et les reflets sont procéduraux ; les petites rides sont filtrées à distance. Une perte de contexte WebGL affiche une erreur avec rechargement explicite. En l’absence de WebGL 2, un message remplace le démarrage de la scène.

## Vérification et limites

La version actuelle passe 47 tests de logique, physique, météo, objectifs, accostage,
trafic, passagers, annonces et notation, ainsi que le build TypeScript/Vite.
Les essais navigateur couvrent les modes, le radar, les passagers, les amarres,
pause/reprise, IndexedDB, l'édition des commentaires, le repli sans voix française
et des événements tactiles sur écran d'iPad simulé. Voir [les règles du jeu](docs/GAMEPLAY.md)
et [les limites de validation de la phase 5](docs/IMMERSION.md). Le parcours initial
d'exploration ci-dessous documente les vérifications des premières phases.

Build TypeScript strict + Vite et deux tests d’horloge validés. Démarrage HTTP vérifié. Inspection Chromium aux formats 1440 × 900, 1024 × 768, 390 × 844 et 667 × 375. Vérifications automatisées des profils, FPS, pause, boutons caméra, gestes glisser/pincer, préférences après rechargement, redimensionnement, perte de contexte et absence de WebGL 2 ; aucune erreur JavaScript ou shader durant le parcours normal. Les captures et le script ponctuel de contrôle sont dans `.qa/` (ignoré par Git, dépend de l’outil navigateur local). Le rendu réel sur Safari/iPad et les 30 FPS sur l’appareil cible restent à valider ; l’émulation de taille et de toucher ne remplace pas ce test.

Direction d’interface : Data terminal (seed 1752588026), sans nouveau tirage. Surfaces neutres, police système locale, accent émeraude limité aux commandes ; la mer reste l’élément dominant. La question de l’écran est « puis-je explorer l’environnement maritime ? ». L’avertissement de l’inspecteur sur la proportion de couleur est accepté : il mesure la mer 3D elle-même. Aucun chiffre de navigation ni donnée météo réelle n’est inventé.

Le littoral, les monuments et les cales accompagnent le navire pilotable. Vent, vagues, courants, profondeur, marée et dégâts sont des modèles simplifiés calibrés pour le jeu. Les missions utilisent la physique existante et une sauvegarde locale automatique. Les phases suivantes restent hors périmètre.

Références techniques : [Vite](https://vite.dev/guide/), [Three.js](https://threejs.org/docs/).
