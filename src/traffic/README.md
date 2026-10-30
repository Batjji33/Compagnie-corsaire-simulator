# Trafic et navettes autonomes

`Traffic.ts` conserve les 24 navires ambiants et ajoute trois agents `taxi`, dans
la même liste de positions, contacts, risques, radar et rendu. La densité et le
profil graphique concernent le trafic ambiant ; les trois navettes restent actives
quand le trafic est activé, y compris la nuit. Aucun second moteur de simulation.

`WaterTaxis.ts` pilote Étoile de la Rance, Belle du Moulinet et Alizé de Cézembre :
traversée, approche, attente, accostage, escale et départ. Leurs positions initiales
et leurs escales déterministes de 60 à 120 secondes décalent les rotations. La
vitesse de croisière est de 17 nd maximum, réduite par la météo ; l’approche se fait
à 4 nd, l’accostage à 1,4 nd et le dégagement initial en marche arrière à 2 nd.
Les accélérations et rotations sont bornées par le pas physique. Les voies de
traversée sont séparées, l’approche de Saint-Malo aligne la coque avant le quai.
Les transferts numériques prennent 12 s de débarquement puis 18 s d’embarquement.

`Berths.ts` gère une place par port avec occupant, réservation et file FIFO sans
doublon. La réservation d’une IA couvre aussi la manœuvre de départ, jusqu’au
dégagement du chenal. La présence physique du joueur est détectée à 45 m et
conservée jusqu’à 65 m. L’approche du joueur demande une réservation ; l’action
d’amarrage vérifie la disponibilité avant de toucher la mission ou les passagers.
Un joueur qui force physiquement l’accès peut bloquer la manœuvre et doit s’écarter.

Les navettes attendent hors du chenal, sur des points séparés. Elles anticipent les
rapprochements avec les vitesses relatives et s’écartent si une attente bloque une
approche. Un dernier contrôle d’espacement empêche d’avancer dans une autre coque ;
le trafic ambiant cède aussi cet espace aux navettes. Les contacts provoqués par
le joueur restent traités par les capsules et forces existantes : aucune téléportation
correctrice ni annulation des dégâts. Une navigation volontairement dangereuse du
joueur peut toujours créer un contact.

Après 30 s à attendre le joueur, une navette demande une corne de 5 s, puis toutes
les 25 s à partir du début du signal précédent. Un arbitre conserve une seule voix
active et décale les demandes concurrentes pour donner un tour à chaque navette.
La libération de la cale coupe immédiatement le signal. La synthèse est commune
à la corne du joueur ; une source Web Audio spatialisée applique l’atténuation
inverse de distance (référence 70 m). Pause, son désactivé et volume nul coupent
la voix. Le bouton de corne du joueur garde la priorité.

Le temps est exclusivement celui de la simulation. « Passer l’attente » avance
aussi le trafic par petits pas pendant que le joueur reste amarré ; les signaux
intermédiaires ne sont pas rejoués. Désactiver le trafic le masque et le suspend,
avec conservation des positions et réservations pour une reprise cohérente.
Comme le trafic ambiant, la flotte repart à l’ouverture d’une nouvelle session ;
son apparition initiale respecte la position restaurée du joueur. Commencer une
nouvelle partie réinitialise les files. Le trajet, les horaires et les statistiques
du joueur gardent leur sauvegarde existante.

`TrafficView.ts` réutilise l’extérieur de `CorsaireModel`, sans cockpit ni textures
d’instruments. Chaque silhouette est fusionnée en un maillage à couleurs de
sommets (environ 10 200 sommets), plus deux plaques de nom visibles à proximité.
La variante bleue possède un auvent, la rouge deux cheminées et la verte une
superstructure de pont. Pas d’asset téléchargé ou de dépendance supplémentaire.

Le HUD affiche « Quai occupé — veuillez patienter » lors d’un accostage bloqué.
La carte numérote les trois navettes avec une légende lisible et leur état ; les
échos radar portent leur nom et signalent les attentes proches. Les informations
de réservation détaillées restent dans le panneau de carte.

`tests/water-taxis.test.ts` couvre les priorités réciproques, les files, les
libérations, les rotations prolongées avec et sans trafic ambiant, les transferts,
les dégagements physiques aux quais, l’évitement du joueur, les bornes de mouvement,
les cornes concurrentes et la reproductibilité à 30/144 FPS. Le contrôle local
`.qa/water-taxis-check.mjs` vérifie les modèles, le Web Audio, l’accostage bloqué,
le saut temporel et le HUD sur cinq formats Chromium. Safari/iPad physique reste
à vérifier pour les performances matérielles et l’audio du navigateur.

Validation finale : `npm test` réussit avec 99 tests ; `npm run build` réussit,
avec l’avertissement habituel de taille du bundle principal (environ 805 ko).
Les contrôles Chromium passent à 1 440 × 900, 1 024 × 768, 768 × 1 024,
844 × 390 et 390 × 844, sans commande couverte ni débordement horizontal.
La carte mobile conserve une légende lisible pour les trois noms. L’inspection
visuelle du HUD indique zéro échec ; son avertissement de bordures ne tient pas
compte de l’alpha du thème existant.
