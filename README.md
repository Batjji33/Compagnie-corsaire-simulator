# Compagnie Corsaire Simulator — phase 1

Simulateur maritime web local : fondations de la phase 0 et environnement simplifié Saint-Malo–Dinard. Scène procédurale sans ressource distante, sans API ni service payant. Développement sur `develop`. Voir [le dossier environnement](docs/ENVIRONMENT.md) pour les sources, les choix fictifs, les budgets et les limites.

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

## Commandes

- Glisser un doigt ou le bouton gauche de la souris : tourner la caméra.
- Pincer à deux doigts, utiliser la molette ou les boutons +/− : zoomer.
- Glisser à deux doigts ou au bouton droit : déplacer la caméra. Maintenir les flèches tactiles pour avancer, reculer ou se déplacer latéralement.
- Sélectionner Saint-Malo, Dinard, toute la baie ou les forts ; ouvrir Carte pour les repères et le tracé schématique.
- Recentrer : revenir à la vue initiale.
- Clavier, après focus sur la scène : flèches pour tourner, WASD/ZQSD pour déplacer, +/− pour zoomer, R pour recentrer.
- Pause : arrêter la mer tout en conservant la caméra libre.
- Réglages : qualité graphique et compteur FPS réel, enregistrés localement si le stockage est disponible.

## Architecture

| Dossier / fichier | Responsabilité |
| --- | --- |
| `src/config.ts` | Cadences, caméra, mer, soleil, profils graphiques |
| `src/core/` | Horloge fixe, ordonnanceur de rendu, erreurs |
| `src/world/` | Scène, ciel, mer GPU, caméra, chargement GLB/glTF à la demande |
| `src/weather/` | Éclairage naturel et état de jour initial |
| `src/instruments/` | Mesure des images réellement rendues |
| `src/ui/` et `src/style.css` | Interface DOM, commandes tactiles et adaptation de l’écran |
| `src/saves/` | Préférences versionnées et validation des valeurs stockées |
| `src/ships/`, `src/physics/`, `src/missions/`, `src/audio/` | Points d’extension documentés, sans fonctionnalités fictives |
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

Build TypeScript strict + Vite et deux tests d’horloge validés. Démarrage HTTP vérifié. Inspection Chromium aux formats 1440 × 900, 1024 × 768, 390 × 844 et 667 × 375. Vérifications automatisées des profils, FPS, pause, boutons caméra, gestes glisser/pincer, préférences après rechargement, redimensionnement, perte de contexte et absence de WebGL 2 ; aucune erreur JavaScript ou shader durant le parcours normal. Les captures et le script ponctuel de contrôle sont dans `.qa/` (ignoré par Git, dépend de l’outil navigateur local). Le rendu réel sur Safari/iPad et les 30 FPS sur l’appareil cible restent à valider ; l’émulation de taille et de toucher ne remplace pas ce test.

Direction d’interface : Data terminal (seed 1752588026), sans nouveau tirage. Surfaces neutres, police système locale, accent émeraude limité aux commandes ; la mer reste l’élément dominant. La question de l’écran est « puis-je explorer l’environnement maritime ? ». L’avertissement de l’inspecteur sur la proportion de couleur est accepté : il mesure la mer 3D elle-même. Aucun chiffre de navigation ni donnée météo réelle n’est inventé.

La phase 1 ajoute le littoral interprété, les monuments et les cales. Elle ne contient pas de modèle du Corsaire d’Émeraude, de propulsion, flottabilité, collisions physiques, missions ou audio. Les vagues et profondeurs sont visuelles. Les futures sauvegardes de partie sont distinctes des préférences actuelles. Cinq tests automatisés couvrent désormais l’horloge et les données géographiques.

Références techniques : [Vite](https://vite.dev/guide/), [Three.js](https://threejs.org/docs/).
