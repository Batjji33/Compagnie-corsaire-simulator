# Modes de jeu et traversée Saint-Malo–Dinard

## Jouer

Le menu principal propose **Navigation libre**, **Missions**, **Paramètres** et
**Progression et statistiques locales**. **Menu** et **Pause** suspendent la
simulation. **Reprendre la partie** permet de revenir au pilotage. Le menu est
utilisable au doigt, avec défilement sur les écrans courts et des boutons d'au moins
44 px. Le poste de commande compact reste sous la vue 3D : moteurs à gauche,
vitesse, cap et suivi de mission au centre, barre à droite. Les étapes détaillées
se déroulent dans ce poste et ne recouvrent pas la mer. L'aide clavier se trouve
dans le pied de page, à côté de Pause.

En mode libre, choisir la mer, l'heure, la direction du vent et les dégâts, puis
**Prendre la barre**. Les réglages détaillés restent accessibles pendant la conduite.
Aucun objectif ou temps limite ne s'applique. La distance et le temps de navigation
libre alimentent les statistiques locales.

## Première mission

1. **Préparation** : consulter le trajet suggéré, les conditions et le départ de
   14 h. La cible d'arrivée est 14 h 06, soit environ 5–6 minutes de jeu pour une
   traversée menée sans incident. Le temps physique reste à 1× et la baie conserve
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
   12 m autour de la zone ocre. S'aligner nord–sud à ±20°, rester sous 0,7 nd, moteurs
   au neutre, sans contact ni échouement, avec faible rotation pendant 4 secondes.
   Les critères s'affichent en direct. **Amarrer et débarquer** devient alors disponible.
7. **Débarquement** : le bateau est maintenu à poste pendant 12 secondes. La mission
   se valide seulement lorsque tous les passagers sont débarqués.
8. **Bilan** : consulter les quatre critères et la note globale, puis recommencer
   ou retrouver les statistiques.

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

Une coque endommagée à 85 %, plus de 15 secondes cumulées d'échouement, la sortie
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
mission active, historique des 100 derniers résultats et statistiques cumulées.
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

Les essais tactiles sur Chromium avec écran d'iPad et sur petit écran complètent le
build TypeScript/Vite. Ils ne remplacent pas un essai matériel Safari/iPadOS.
Les données maritimes sont fictives et ne doivent jamais servir à naviguer réellement.
La phase suivante n'est pas commencée.
