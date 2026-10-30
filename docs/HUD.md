# HUD immersif

La scène Three.js occupe tout le viewport, sans bandeau réservé au-dessus ou sous la mer. Les zones vides des calques HTML laissent passer les gestes de caméra. La physique, les missions, les sauvegardes, le trafic et le rendu de la mer conservent leur fonctionnement.

## Organisation

- En haut : identité du jeu, vitesse fond, cap avec ruban de compas, hauteur sous quille et outils Carte / Radar / Instruments / Réglages / Menu.
- À gauche : sélection des points de vue, radar repliable et commandes indépendantes des deux moteurs.
- À droite : vues extérieur / passerelle, zoom et recentrage, barre avec cadran et corne de brume.
- Au bord inférieur central en paysage : consigne de mission, action de départ ou d’accostage et journal de bord repliable. Le commentaire touristique se place juste au-dessus, dans le même groupe, pour dégager le navire et éviter tout chevauchement entre les deux modules.
- Au bord inférieur : état de la traversée et des passagers, aide, excursion, son et pause. Les annonces touristiques se lisent dans un module repliable.

Les instruments détaillés sont fermés au premier lancement. Le radar s’affiche par défaut à partir de 700 px de hauteur et de largeur ; il se replie à l’entrée dans un format compact et reste accessible par son bouton. Les panneaux restent déplaçables au doigt et au clavier ; leurs positions sont bornées à la scène et le bouton de remise en place concerne aussi la carte.

## Pilotage

Les chevrons des moteurs ajoutent ou retirent un cran. Un maintien répète la commande après 450 ms, puis toutes les 300 ms. Les sept crans et la progression physique de poussée restent identiques. L’afficheur de chaque moteur sert aussi à le remettre au neutre ; « Deux au neutre » agit sur les deux moteurs.

Un appui bref sur une flèche de barre ajuste la consigne de 1°. Le maintien tourne progressivement, au même rythme que le clavier. Le relâchement conserve l’angle demandé. « Au milieu » remet la consigne à zéro ; le cadran montre l’angle réel du gouvernail. Moteurs et barre se commandent simultanément avec plusieurs doigts. Relâchement, annulation du geste, perte de capture, perte de focus, masquage de l’onglet et pause arrêtent les entrées maintenues.

Les raccourcis existants sont conservés : ↑ / ↓ pour les deux moteurs, Q / A à bâbord, E / D à tribord, ← / → pour la barre, X au milieu, Espace au neutre et C pour la caméra.

Le bouton de portée du radar alterne 500, 1 000 et 250 m. Côtes, obstacles, hauts-fonds et trafic sont mis à l’échelle ensemble. Le nord reste fixe ; le cap du navire est indiqué par le triangle et sa ligne de foi. Le nombre d’échos concerne les navires à portée, tandis qu’un risque de croisement garde la priorité dans le message.

## Implémentation et performances

`Interface.ts` gère la scène et les outils, `HelmControls.ts` les commandes et instruments principaux, `MarinePanel.ts` les panneaux et le radar, `Game.ts` la mission et `Immersion.ts` les annonces et le son. `icons.ts` fournit les pictogrammes SVG partagés. `style.css` remplace les anciens layouts de bandeaux par les calques et leurs variantes responsives.

Aucune dépendance, police distante, image ou boucle de rendu supplémentaire. Les instruments maritimes restent échantillonnés à 5 Hz et le poste de conduite à 10 Hz. La barre maintenue utilise la boucle physique existante. Les surfaces translucides n’utilisent ni filtre de flou ni animation continue. Les zones sûres iPad et la hauteur dynamique du navigateur sont prises en compte ; les boutons font au moins 44 px et le mode de mouvement réduit est respecté.

Direction de design : **Data terminal**, graine **173972**, adaptée au HUD de jeu demandé. Typographie système et accent maritime conservés ; la signature est le poste à deux moteurs accompagné du compas et du radar de la baie. La question principale est « comment piloter tout en gardant la mer visible ? ». Les panneaux flottants et leur transparence répondent à cette demande, sans reprendre un cadre de tableau de bord. Aucune donnée de démonstration ajoutée : toutes les valeurs viennent de la simulation.

## Vérifications

- `npm run build` : TypeScript et build Vite de production réussis. Vite signale un bundle principal d’environ 766 ko pour un seuil de 650 ko ; cet avertissement n’empêche pas la compilation et aucune dépendance n’a été ajoutée.
- `npm test` : 61 tests de simulation, missions, eau, trafic, passagers et son.
- Chrome avec émulation tactile : sept crans et bornes, neutralisation indépendante, barre et moteur simultanés, maintien, annulation du toucher, clavier, corne, pause pendant un maintien, caméras, exploration et recentrage, portée radar, panneaux, briefing, embarquement, amarres et journal de mission. Déplacement borné et remise en place des panneaux, sauvegarde des réglages et reprise de mission après rechargement également vérifiés.
- Captures et contrôle des cibles tactiles en 1 024 × 768, 1 180 × 820, 1 440 × 900, 820 × 650, 844 × 390, 768 × 1 024 et 390 × 844. Vue 3D plein écran et absence de débordement horizontal. Les commandes de mission ont aussi été inspectées aux formats PC, iPad, paysage court et téléphone.
- Inspection de design en navigateur : aucun échec dans les règles applicables aux interfaces applicatives. Deux réserves automatiques interprétées : les bordures translucides sont mesurées sans leur alpha ; la gamme de tailles comprend les textes de carte en coordonnées SVG et les chiffres des instruments.

Les scripts et captures de contrôle locaux se trouvent dans `.qa/hud-*` (répertoire ignoré par Git). La validation dans Safari sur un iPad physique reste à effectuer : l’émulation Chrome ne mesure ni les performances du GPU de l’iPad ni les particularités WebKit.
