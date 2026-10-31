# Modes de jeu et traversée Saint-Malo–Dinard

## Jouer

Le menu principal propose **Navigation libre**, **Missions**, **Paramètres** et
**Progression et statistiques locales**. **Menu** et **Pause** suspendent la
simulation. **Reprendre la partie** permet de revenir au pilotage. Le menu est
utilisable au doigt, avec défilement sur les écrans courts et des boutons d'au moins
44 px. Le HUD est superposé à une vue 3D plein écran : moteurs à gauche,
instruments en haut et barre à droite. Le suivi reste au bord inférieur central,
avec les étapes dans le journal repliable. L'aide clavier se trouve à côté de Pause.

En mode libre, choisir la mer, l'heure, la direction du vent et les dégâts, puis
**Prendre la barre**. Les réglages détaillés restent accessibles pendant la conduite.
Aucun objectif ou temps limite ne s'applique. La distance et le temps de navigation
libre alimentent les statistiques locales.

## Service Saint-Malo ↔ Dinard

1. **Préparation** : consulter le trajet suggéré, les conditions et le départ de
   14 h. Chaque traversée dispose de 6 minutes, quel que soit le navire choisi.
   Le temps physique reste à 1× et la baie conserve
   son échelle ; le temps final dépend des manœuvres et de la vitesse choisie.
2. **Embarquement** : charger 180 passagers en 18 secondes. Le bateau est amarré,
   la propulsion bloquée et les caméras restent accessibles.
3. **Départ** : appuyer sur **Larguer les amarres**. Les moteurs deviennent actifs.
   Quitter les 80 premiers mètres sous 4 nd ; anticiper le virage vers le sud-ouest.
4. **Traversée** : croisière conseillée à 17 nd. Suivre les anneaux verts et le cap
   suggéré, ou choisir librement sa route. Les points de passage ne sont pas obligatoires.
5. **Approche** : le ponton du Clair de Lune est signalé en ocre. Anticiper le freinage
   dès le dernier point suggéré, puis réduire sous 5 nd dans les 220 derniers mètres.
   Le neutre ne freine pas immédiatement : utiliser progressivement la marche arrière.
6. **Accostage** : rejoindre le côté est du ponton, centre du navire dans un rayon de
   30 m autour du repère ocre agrandi (rayon multiplié par 2,5). À strictement moins
   de 2 nd, **Amarrer et débarquer** est disponible immédiatement, sans cap imposé,
   sans passage obligatoire au neutre et sans attente de stabilité. Le HUD indique la distance,
   la vitesse et la raison d'un éventuel blocage. Un contact incident ou un dégagement
   sous la quille inférieur ou égal à 0,3 m empêche l'amarrage.
7. **Escale** : le bateau reste à sa position d'accostage. Les passagers débarquent
   en 12 secondes, puis le retour embarque en 18 secondes. L’escale dure 2 minutes
   après l’arrivée prévue ou l’arrivée réelle si elle est plus tardive. Une arrivée
   anticipée conserve donc le temps restant des 6 minutes avant ces 2 minutes.
   Après les transferts, **Passer l’attente** avance l’heure au départ autorisé,
   sans déplacer le bateau. Le largage reste manuel.
8. **Retour** : à la fin de l’escale, le compteur ajoute la traversée et les voyageurs
   livrés, puis prépare le trajet inverse sans menu ni rechargement. Les effectifs
   varient raisonnablement entre 140 et 260 voyageurs, sans dépasser la capacité de
   270. La destination, les repères et les indications de cap s'inversent. Une fois
   l’escale terminée, rester au port librement ou larguer les amarres.
9. **Fin du service** : ouvrir le journal de bord ou le menu de pause, puis choisir
   **Terminer le service** et confirmer. Le bilan affiche traversées réalisées,
   voyageurs transportés, durée totale, satisfaction moyenne et qualité des accostages.
   Seuls les débarquements terminés comptent ; arrêter en cours de trajet ne compte
   pas les voyageurs encore à bord. Annuler la confirmation reprend le même service.

L’horloge HH:mm apparaît sous le chronomètre. Le compteur alterne 6 minutes de
traversée et 2 minutes d’escale, même en attente de cale, puis repart sur 6 minutes.
La destination reste celle du trajet en cours jusqu’à l’accostage et la fin de
l’escale réelle. Le retard augmente jusqu’à l’accostage ; « À l’heure », « En avance »,
« En retard » et « En escale » restent affichés selon la situation réelle. Le journal
présente les horaires, le temps de navigation, les escales et les retards cumulés.
Chaque rotation prévoit 6 minutes de navigation puis 2 minutes d’escale ; le bateau
ne repart donc pas toutes les 6 minutes. Un départ volontairement tardif consomme
le créneau prévu. La pause suspend toute l’horloge de simulation.

Les allers-retours sont illimités. Les retards et les incidents
n'arrêtent pas automatiquement le service : dégâts, perte de puissance, contacts et
satisfaction continuent de s'appliquer. La navigation libre et les missions classiques
conservent leur fonctionnement propre. Aucun horaire réel n'est reproduit.

Trois bateaux-taxis IA assurent aussi leurs rotations et partagent les cales.
À l’approche, une place occupée ou réservée bloque « Amarrer et débarquer » avec
« Quai occupé — veuillez patienter ». Garder le chenal libre et attendre la fin
du dégagement. Les navettes vous laissent la cale tant que vous l’occupez ; après
30 secondes, elles peuvent signaler leur attente à la corne. Leurs noms et états
sont visibles sur la carte et le radar. « Passer l’attente » conserve leur activité
pendant le saut de temps, sans déplacer votre navire.

Le temps de mission s'arrête en pause et lorsque l'onglet est masqué. L'horloge du
navire avance en temps normal pendant la mission, indépendamment du cycle accéléré
jour/nuit conservé dans le mode libre. La météo du briefing est fixée pour la mission ;
elle continue d'évoluer progressivement. Les paramètres graphiques, le son et les
instruments restent réglables.

## Note et incidents

- Ponctualité : 20 % ; pénalité après la cible de 6 minutes, sans échec automatique.
- Sécurité : 35 % ; contacts, dégâts, excès de vitesse et échouements sont pénalisés.
- Confort : 20 % ; accélérations et efforts latéraux brusques diminuent la note.
- Manœuvres : 25 % ; contacts et reprises au point sûr réduisent la note.

Aux quais, les boudins protègent les appuis latéraux : le navire reste repoussé
physiquement et ne traverse pas le quai, mais ces appuis ne déclenchent ni contact
incident, ni dégâts, ni pénalité et n'empêchent pas l'amarrage. Les touches par
l'avant ou l'arrière restent des incidents. Cette protection ne s'applique pas aux
côtes, rochers et autres navires : leurs contacts restent actifs sur toute la coque.

Les valeurs par défaut sont partagées dans `src/missions/docking.ts`. Le calcul
d'amarrage, le briefing, le HUD et la taille du repère ocre utilisent les mêmes règles.
Les nouvelles traversées les héritent en omettant le champ `docking` de leur définition.

Pour une mission classique hors service continu, une coque endommagée à 85 %, plus de 15 secondes cumulées d'échouement, la sortie
de la zone de jeu ou 20 minutes sans arrivée interrompent la mission avec une raison
explicite. Le résultat interrompu est enregistré. **Reprendre au point sûr** revient
au départ ou, après avoir atteint Dinard, à 120 m au sud du ponton, déjà aligné.
Le temps et les pénalités restent acquis ; la coque retrouve au moins 70 % de son
intégrité. Chaque reprise ajoute une pénalité de 15 points au critère manœuvres et
5 minutes au temps maximal autorisé. **Redémarrer la mission** recommence le briefing
et remet à zéro le temps, les passagers et les métriques de cette tentative.

## Sauvegarde

IndexedDB `corsaire.game`, version 1, contient un profil `main` dans le magasin
`profile` : réglages graphiques et maritimes, disposition/visibilité des instruments,
mission active, historique des 100 derniers trajets, des 100 derniers bilans de
service et statistiques cumulées. Le service actif conserve aussi sa direction,
ses compteurs, les moyennes cumulées et la progression de l'escale. Les anciennes
sauvegardes de la traversée aller sont reprises sans réinitialiser le trajet en cours.
Les anciens réglages graphiques localStorage sont importés lors du premier démarrage.
Toutes les nouvelles écritures utilisent IndexedDB, sans compte ni requête réseau.

La mission active est sauvegardée toutes les 10 secondes de simulation, à chaque
changement d'étape et à l'ouverture du menu. Après rechargement, elle est proposée
en pause et conserve sa position, son cap, ses vitesses, ses commandes, ses objectifs,
son temps et ses pénalités. Les transitions météo reprennent depuis le préréglage
enregistré ; leurs oscillations exactes ne sont pas restaurées. Le mode libre conserve
les réglages et statistiques, mais redémarre à Saint-Malo après fermeture de la page.
Si le stockage est indisponible, le jeu reste utilisable avec une indication claire
que les données sont limitées à la session. Effacer les données du navigateur efface
également la progression.

## Validation

`npm test` couvre les phases, l'ordre des objectifs, la stabilité d'accostage, les
échecs, les reprises, les scores, la validation des données stockées, la restauration
de la physique et les dégagements aux quais. Les anciens tests de navigation et météo
restent exécutés. Le contrôle navigateur couvre les deux modes, l'embarquement, les
amarres, pause/reprise, rechargement IndexedDB, les points de reprise, un accostage
physique réel, le débarquement et le bilan persistant. Les phases de navigation
intermédiaires sont initialisées par sauvegarde dans ce contrôle pour ne pas imposer
une traversée complète à chaque vérification de l'interface.

Les tests du service couvrent 150 rotations successives, les attentes prolongées,
les effectifs et la capacité, les moyennes pondérées, la comptabilité sans doublon,
la reprise du trajet retour et les sauvegardes invalides. Le contrôle navigateur
enchaîne un aller-retour avec positions de navigation préparées : identité de la
scène et du bateau inchangée aux escales, foules aux deux cales, reprise après
rechargement à Dinard, départ manuel, annulation de fin de service, bilan persistant
et retour au mode libre. Le HUD est inspecté sur six formats d'écran.

`tests/timetable.test.ts` vérifie aussi les arrivées anticipées, ponctuelles et
tardives, plusieurs créneaux manqués, les départs prolongés, les transferts,
les sauts temporels sans déplacement, le cumul des retards, la fin en escale,
la reprise des horaires et leur validation, minuit et l’égalité à 30 et 144 FPS.

Les essais tactiles sur Chromium avec écran d'iPad et sur petit écran complètent le
build TypeScript/Vite. Ils ne remplacent pas un essai matériel Safari/iPadOS.
Les données maritimes sont fictives et ne doivent jamais servir à naviguer réellement.
La phase suivante n'est pas commencée.
