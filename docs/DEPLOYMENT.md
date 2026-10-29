# Déployer sur Cloudflare Pages via GitHub

Le jeu est un site statique Vite. Aucun serveur, secret, service payant ou fichier Wrangler n'est nécessaire. Le sous-domaine `pages.dev` permet de démarrer avec l'offre gratuite de Pages.

## Connecter le dépôt

1. Dans le tableau de bord Cloudflare, ouvrir **Workers & Pages > Create application > Pages > Connect to Git** (ou **Import an existing Git repository**, selon l'interface).
2. Choisir GitHub et autoriser Cloudflare à accéder uniquement au dépôt `Batjji33/Compagnie-corsaire-simulator`.
3. Sélectionner ce dépôt, puis **Begin setup**.
4. Appliquer les paramètres suivants :

| Paramètre | Valeur |
| --- | --- |
| Project name | `compagnie-corsaire-simulator` |
| Production branch | `develop` |
| Framework preset | `None` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Laisser vide (racine du dépôt) |
| Variables d'environnement | Aucune nécessaire |

La version Node.js est définie dans `.node-version` : `22.18.0`. Supprimer une éventuelle variable `NODE_VERSION` contradictoire dans Cloudflare. Conserver l'installation automatique des dépendances npm, y compris celles de développement : TypeScript et Vite servent au build. `package-lock.json` est versionné.

5. Choisir **Save and Deploy**. Une fois le build terminé, ouvrir l'adresse `https://compagnie-corsaire-simulator.pages.dev` (ou celle attribuée par Cloudflare si le nom est indisponible).
6. Vérifier le chargement de la scène, les commandes et l'absence d'erreurs réseau dans le navigateur. Un appareil compatible WebGL 2 est nécessaire.

Les prochains push sur `develop` déclenchent un déploiement de production. Les autres branches peuvent produire des prévisualisations. Aucune branche ne doit être renommée ou supprimée.

## Build et ressources

```sh
npm ci
npm run build
npm test
npm run preview
```

`dist/index.html`, les bundles JS/CSS et le favicon sont produits pour l'hébergement statique. `dist/` et `node_modules/` restent exclus de Git. Le réglage Vite `base: './'` est compatible avec Pages ; aucune réécriture ni modification du jeu n'est nécessaire.

Les modèles du navire et du décor ainsi que leurs textures sont actuellement générés dans le navigateur et inclus dans le code compilé. Aucun modèle, texture ou son externe n'est requis ; l'audio n'est pas implémenté. Le chargeur glTF disponible pour de futurs modèles utilise `import.meta.env.BASE_URL` et le dossier `assets/`.

Vite copie le contenu de `public/` dans `dist/`. Pour de futurs fichiers, les placer dans `public/assets/`, respecter exactement la casse des noms (Cloudflare est sensible à la casse), conserver les chemins relatifs des textures et fichiers `.bin` associés aux `.gltf`, et ne pas utiliser de chemins locaux Windows. Les ressources futures devront être testées après leur ajout. Pages limite chaque fichier statique à 25 Mio.

Ne jamais placer de secret dans `public/` ou dans une variable `VITE_*` : ces contenus sont publics après compilation. Les fichiers d'environnement et de clés locales sont ignorés par Git. Aucun secret n'est nécessaire au déploiement actuel.

## Références

- [Connexion Git et paramètres de déploiement](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Version Node.js via .node-version](https://developers.cloudflare.com/pages/configuration/build-image/)
- [Limites de Pages et de l'offre gratuite](https://developers.cloudflare.com/pages/platform/limits/)
