# Phase 3 — navigation et conditions maritimes

Le simulateur utilise uniquement des données locales fictives. Aucun instrument,
sondage, chenal ou contour ne doit servir à la navigation réelle.

## Utilisation

- **Instruments** affiche ou masque le panneau Navigation. Sur téléphone, il est
  masqué au démarrage pour préserver la vue. Les commandes moteur restent visibles.
- **Réglages → Instruments** permet d'afficher séparément Navigation et Radar.
  Les poignées déplacent les panneaux au doigt ou avec les flèches du clavier.
  **Replacer les instruments** retrouve leur emplacement initial.
- **Carte** conserve la carte de la baie, le triangle du navire et le repère caméra.
  Sa poignée permet aussi de la déplacer. Les ellipses ocre repèrent les hauts-fonds.
- **Réglages → Mer et navigation** propose quatre états de mer, dont Tempête, la direction du
  vent venant de, l'heure, la phase de marée et l'activation des cycles.
  La météo rejoint progressivement la consigne (constante de temps de 18 secondes).
- Un jour dure 24 minutes de simulation et une marée 12 minutes. Pause suspend les
  cycles et la physique. Les réglages maritimes sont propres à la session.
- Les dégâts réduisent la poussée jusqu'à 25 % de sa valeur nominale. Désactiver
  les dégâts restaure la puissance sans effacer l'usure enregistrée ; les contacts
  et échouements restent actifs. **Réparer le navire** remet la coque à 100 %.
- Les alarmes sonores sont disponibles après une interaction utilisateur, espacées
  d'au moins quatre secondes, désactivables et suspendues en pause.

## Modèle et instruments

La vitesse fond est la norme des vitesses longitudinales et latérales, en nœuds.
Le cap désigne l'orientation de la coque, pas la route fond. Le GPS exprime la
position dans le repère métrique local (est et sud), sans prétendre fournir une
position géodésique réelle. Le sondeur affiche la profondeur sous la surface au
centre du navire ; la garde sous quille retient le plus faible de trois sondages
longitudinaux, diminué du tirant d'eau de 1,9 m.

Le radar, orienté nord, représente les polygones de collision et les rochers dans
un rayon de 500 m. Les hauts-fonds pointillés sont une aide synthétique, pas des
échos radar physiques. Il n'existe pas encore d'autres bateaux.

Le vent et les courants sont des forces simplifiées dans la physique existante ;
les vagues ajoutent des efforts oscillants. Six vagues Gerstner déforment réellement
l’eau et déterminent le pilonnement, le roulis et le tangage du navire. Voir
[le modèle d’eau et de sillage](WATER.md). Le niveau de
la mer, le bateau et ses caméras suivent la même marée sinusoïdale de ±2,4 m.
L'éclairage, le ciel, la mer et le brouillard suivent l'heure et la visibilité.
Les côtes et quais restent des solides fixes ; les zones intertidales ne sont pas
un modèle hydrodynamique ou topographique réel.

Les instruments se rafraîchissent à 5 Hz. Le radar ne se reconstruit que lorsqu'il
est visible. Les forces réutilisent le pas physique de 1/60 s ; aucun appel réseau
ni dépendance supplémentaire n'est nécessaire. La phase 4 n'est pas commencée.

## Vérification

`npm test` couvre les transitions météo, le passage du vent par le nord, la marée,
les cycles figés, la vitesse vectorielle, la dérive, les hauts-fonds, l'activation
des dégâts et la baisse de performances, en plus des tests de conduite existants.
`npm run build` vérifie les types et produit le livrable Vite dans `dist/`.
