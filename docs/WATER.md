# Vagues, flottaison, sillage et corne de brume

## Utilisation

Les réglages de mer et le menu de navigation libre proposent **Calme**, **Belle mer**,
**Mer agitée** et **Tempête**. La météo évolue progressivement avec la constante de
temps existante de 18 secondes. Le nouveau profil Tempête vise 42 nd de vent,
5,2 m de hauteur de mer et 1 500 m de visibilité ; les missions gardent leurs conditions.

Maintenir **Corne de brume** sous la barre pour sonner, au doigt ou à la souris.
Le bouton fonctionne aussi avec Entrée/Espace ; une activation par lecteur d’écran
produit un coup court. Il reste disponible pendant l’amarrage, lorsque les moteurs
sont verrouillés. Le premier appui active le son et déverrouille Web Audio depuis
le geste utilisateur. Le volume **Corne de brume** est indépendant des alarmes,
respecte le volume général et est enregistré dans les préférences existantes.
Un volume nul reste silencieux. Relâchement, annulation du toucher, perte de focus,
pause et passage en arrière-plan arrêtent la corne ; un maintien est limité à 8 s.

## Eau et coque

`src/weather/Waves.ts` décrit six composantes de Gerstner : déplacements verticaux
et horizontaux, directions légèrement divergentes, longueurs non multiples et
dispersion gravitaire. La hauteur suit `Marine.waves`, les longueurs suivent la
hauteur et le vent, les fréquences suivent les longueurs, les directions suivent
le vent. Les phases sont intégrées au pas physique plutôt que recalculées comme
fréquence × temps : changer la météo ne provoque pas de saut de phase.

Le même spectre est transmis au shader d’`Ocean.ts` et utilisé pour la flottaison.
Le calcul CPU inverse le déplacement horizontal pour échantillonner l’eau à des
coordonnées réelles. Cinq sondes (centre, avant, arrière, bâbord, tribord) déterminent
le pilonnement et l’assiette d’une coque rigide de 26,3 m. Le bateau ne suit plus une
oscillation indépendante de l’eau. Les caméras suivent le pilonnement sans rouler
l’horizon ; les navires autonomes suivent également cette surface.

L’océan reste un seul maillage continu de 16 km, concentré autour du point regardé.
En qualité légère, les sommets proches sont espacés de 3 m, contre environ 250 m
auparavant. Les composantes trop courtes sont amorties dans les zones lointaines
moins détaillées. Les normales sont dérivées des vagues, avec reflets analytiques,
creux plus sombres, écume des crêtes et couleurs côtières conservées. Une petite
texture procédurale répétable de 128 × 128 pixels donne des variations organiques
à l’écume, sans image téléchargée ni rendu hors écran.

## Sillage

`WakeTrail.ts` conserve au maximum 144 échantillons en coordonnées mondiales,
émis toutes les 0,18 s de simulation et dissipés en 24 s. La trace reste sur le
trajet réellement parcouru, y compris dans les virages et en marche arrière.
Une téléportation, une nouvelle traversée ou une reprise au point sûr efface la trace.
Un bateau arrêté ou amarré n’émet pas de nouveau sillage ; une trace précédente
se dissipe progressivement. La largeur et la blancheur dépendent de la vitesse
et de la poussée réelle, avec dérive lente par le courant.

`WakeView.ts` dessine une traînée centrale et deux branches divergentes, avec
une petite crête géométrique. Leurs sommets suivent la hauteur du même spectre
Gerstner sur le GPU. Le shader de l’océan ajoute les turbulences d’hélices à la
poupe et une écume d’étrave, proportionnelles à la poussée et à la vitesse.

## Audio et budget

La corne est une synthèse originale : deux fondamentales de 147 et 196 Hz, leurs
harmoniques, une montée douce, un léger vibrato et un souffle filtré. Elle réutilise
le contexte et le mélangeur existants, sans fichier, attribution externe ou service.
Une seule corne peut être active ; les sources sont libérées après leur extinction.

| Profil | Sommets de l’océan | Triangles de l’océan |
| --- | --- | --- |
| Légère | 16 641 | 32 768 |
| Équilibrée | 25 921 | 51 200 |
| Élevée | 50 625 | 100 352 |

Le sillage réserve 1 296 sommets et au plus 1 716 triangles, dans un seul appel de
dessin supplémentaire. Les profils Légère/Équilibrée gardent leur cible de 30 FPS,
leurs limites de résolution et les limites de trafic existantes. Pas de simulation
FFT, de particules individuelles, de réflexion par seconde caméra ou de nouvelle dépendance.

Dans la vue du port à 1 024 × 768 en qualité légère, le contrôle Chromium a relevé
18 navires actifs, 98 appels de dessin, 100 927 triangles et 30,03 FPS sur la fenêtre
mesurée (environ 1,87 ms CPU en moyenne pour le rendu). Ce relevé sur l’ordinateur
de développement ne préjuge pas du résultat sur iPad. Le nombre de géométries GPU
reste stable en passant entre les trois profils.

## Vérification et limites

`npm test` couvre le relief calme/agité/tempête, l’inversion horizontale de Gerstner,
la continuité météo, l’assiette de coque, la durée et la mémoire du sillage, les
virages, l’arrêt, l’amarrage, l’arrière et le déterminisme à 30/144 FPS, ainsi que
la compatibilité des anciennes préférences audio et des sauvegardes météo.

Les scripts `.qa/water-*.mjs` vérifient dans Chromium les shaders, les différences
calme/agité/tempête, la concordance des hauteurs GPU/CPU, le sillage courbe et les
formats ordinateur/iPad/téléphone. Une lecture GPU en tempête retrouve les hauteurs
CPU à moins de 0,003 m aux points contrôlés. Le signal audio, ses deux fondamentales,
les gestes tactiles/clavier, la coupure en pause et le volume persistant sont vérifiés.

Il s’agit d’une mer procédurale et d’une flottaison simplifiée, sans déferlement
volumique, calcul de pression complet, embruns individuels ni réfraction sous-marine.
La bathymétrie et les collisions restent celles de la simulation plane existante.
La régularité à 30 FPS et le déverrouillage audio Safari/iPadOS doivent encore être
mesurés sur l’iPad cible ; Chromium avec émulation tactile ne certifie pas cet appareil.
