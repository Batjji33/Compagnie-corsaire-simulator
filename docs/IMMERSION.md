# Phase 5 — baie vivante

## Trafic autonome

Le trafic comprend cinq voiliers, cinq bateaux de plaisance, cinq ferries, cinq
vedettes et quatre cargos, soit 24 navires. Chaque définition de `src/traffic/Traffic.ts` possède une route en mètres,
un nom, une famille, des dimensions et une vitesse. Les navires suivent des trajets
dans l'avant-port, au centre de la baie, près de Dinard et au large des forts.
Ils tournent progressivement, ralentissent dans les croisements et choisissent un
écart simple à tribord ou un ralentissement pour éviter le joueur et leurs voisins.
Une vérification du littoral, des quais et des rochers empêche les trajets sur terre.
Les comportements sont des règles de jeu, sans valeur de règlement maritime réel.

Le profil léger limite le trafic à 18 navires ; les autres profils en autorisent
24, soit trois fois les limites précédentes. La nuit et le brouillard en conservent
neuf, la mer agitée douze, soit également trois fois les anciennes densités.
La météo diminue aussi les vitesses. Les suppressions se font loin du joueur et les nouvelles
activations gardent 180 m plus les demi-longueurs du joueur et du navire autonome.
Une séparation supplémentaire entre navires actifs empêche les activations superposées.
Les navires proches sont conservés temporairement lors d'une baisse de densité.

Les cargos mesurent 108, 120, 126 et 130 m, pour 18 à 22 m de large, avec une coque
haute, une passerelle arrière, une cheminée et des rangées de conteneurs. Leur vitesse
nominale varie de 7,5 à 9 nd. Ils suivent de larges circuits fermés au large des forts,
avec une rotation limitée à environ 1,43°/s et une réponse en vitesse sur dix secondes.
Les navires ralentissent dans les virages ; les marges d’évitement tiennent compte
des longueurs des deux coques et les cargos anticipent les croisements sur 55 secondes.
Le contrôle du littoral utilise une marge d’une demi-longueur et les limites de la baie.
Les capsules de collision couvrent également les extrémités des grandes coques.

La prévision de rapprochement compare les vitesses relatives sur 35 secondes. Elle
déclenche un avertissement visuel et, si le son est activé, un avertissement sonore.
Les contacts entre coques ajoutent des efforts à la physique existante et utilisent
les dégâts et la notation de sécurité déjà présents. Désactiver les dégâts conserve
les contacts et avertissements. Le radar reprend directement les mêmes positions :
échos verts pour le trafic, ocre pour un rapprochement à surveiller, portée de 500 m.

## Passagers

En mission, le compte à bord dépend exactement de la phase et du temps de chargement
ou de déchargement. En mode libre, 48 passagers participent à l'excursion. Le pied de
page indique le nombre et la satisfaction. Celle-ci diminue avec les accélérations,
les efforts latéraux et la hauteur des vagues. L'effet de la mer contribue aussi au
critère de confort de la mission. Les valeurs de confort sont restaurées à la reprise.

Au maximum 40 silhouettes à bord et 40 sur chaque quai représentent les voyageurs.
Les deux quais partagent les mêmes maillages instanciés : toujours quatre appels
de dessin pour corps et têtes du pont et des quais. Seules trois silhouettes se
déplacent sur la passerelle du port actif pendant les transferts. Le groupe du pont
suit les mouvements du navire. Il ne s'agit pas d'un personnage animé pour chacun
des 270 passagers possibles. Les positions sont mises à jour à 5 Hz.

En service continu, les deux cales ont des voyageurs en attente et chaque trajet
renouvelle l'effectif. La satisfaction repart avec les nouveaux passagers ; le bilan
conserve une moyenne pondérée par les voyageurs effectivement débarqués. Chaque
rotation réactive les commentaires géographiques pour les nouveaux voyageurs. Les
introductions de Saint-Malo et Dinard sont adaptées au sens de navigation, en
préservant les textes personnels. Des annonces courtes accompagnent l'accostage,
l'embarquement et le départ ; elles respectent les réglages de son et de voix.

## Excursion et annonces

Le bouton **Excursion** du pied de page et l'entrée **Excursion et son** du menu
ouvrent le panneau en mettant la conduite en pause. Sept commentaires français sont
fournis : remparts, Môle des Noires, Grand Bé, Fort National, pointe du Moulinet,
villas de Dinard et Clair de Lune. Le texte proposé apparaît dans le pied de page,
sans superposer une fenêtre à la mer ni déplacer les commandes de mission.

Les commentaires sont proposés dans leur rayon géographique une fois par excursion.
Par défaut, la lecture vocale attend une validation avec **Lire en français**. On peut
désactiver cette validation pour écouter automatiquement les prochains commentaires,
désactiver les déclenchements géographiques ou couper les annonces touristiques.
**Commentaire suivant** libère la proposition courante ; les propositions suivantes
respectent un intervalle de 30 secondes. Un commentaire lu se libère après le temps
nécessaire à sa lecture. Une lecture manuelle est possible pendant la pause du menu.

Le panneau permet de choisir un texte, de le modifier ou de créer un commentaire à
la position du navire avec son propre titre, texte et rayon. Jusqu'à 50 commentaires
sont conservés dans IndexedDB. Les champs sont validés et affichés comme du texte ;
le HTML saisi n'est jamais exécuté. La source touristique s'affiche pour les textes
d'origine ; une modification personnelle du texte ou du titre retire cette attribution.

La synthèse vocale cherche une voix française, de préférence locale. Si les voix ne
sont pas encore disponibles, si aucune voix française n'existe ou si Safari refuse
la lecture, un message indique le recours au texte et le bouton permet de réessayer.
Aucune voix anglaise n'est imposée et aucun service payant n'est utilisé.

## Son et crédits

Le bouton **Son : non / oui** active l'audio après une interaction. Les réglages
séparent volume général, moteurs, vagues, vent, port, avertissements et annonces.
Les moteurs suivent les commandes physiques effectives et l'ambiance suit la météo
et la distance au port. Les alarmes prennent la priorité sur la voix touristique.
La pause et la mise en arrière-plan suspendent les ambiances et arrêtent la voix.

Tout est synthétisé avec Web Audio : oscillateurs, bruit filtré, harmoniques et
enveloppes. Aucun fichier sonore externe ni ressource sous licence restrictive
n'est nécessaire. Les textes, sources et crédits se trouvent dans
[`public/assets/AUDIO-CREDITS.md`](../public/assets/AUDIO-CREDITS.md).

## Sauvegarde et performances

Le profil IndexedDB existant est étendu sans effacer les anciennes données. Il garde
les commentaires et préférences d'immersion, les volumes, le confort des passagers
et les identifiants des commentaires déjà proposés pour la mission active. Les
anciennes sauvegardes sans ces champs restent lisibles. Le trafic est recréé à la
reprise avec la règle d'éloignement initial ; il n'est pas sauvegardé individuellement.

Le trafic compte au plus 24 agents. Les décisions de route sont calculées à 10 Hz
près du joueur et 2 Hz au loin ; les positions sont intégrées au pas physique fixe.
Les volumes côtiers sont filtrés par leurs bornes avant les tests polygonaux.
Chaque silhouette complète (coque, voile ou passerelle et conteneurs) est fusionnée
en un seul maillage avec couleurs par sommet. Un second maillage de détails est
masqué au-delà de 900 m (1 800 m pour les cargos), en conservant la silhouette.
Les petits navires sont masqués au-delà de 3 km et les cargos au-delà de 6 km.
Les foules sont mises
à jour à 5 Hz, le radar et les affichages à 5 Hz, sans ajout de dépendance npm.
Dans un cadrage large de la baie à 1 024 × 768, Chromium en profil léger a mesuré
107 appels de dessin et 69 325 triangles avec 18 navires actifs, contre
97 appels et 68 330 triangles avec le trafic masqué, à caméra identique. Le coût
dépend du cadrage et des objets visibles ; ces chiffres ne garantissent pas une
cadence sur iPad. Les captures et le rapport se trouvent dans `.qa/naval-*`.

Les tests couvrent trajectoires, virages, densité, prédiction des croisements,
contacts et dégâts, indépendance du rendu, passagers, confort, annonces, validation
des textes et mode sans voix française. Les essais navigateur vérifient également
la 3D, les positions radar, l'édition persistante et les formats ordinateur/iPad.
Une simulation de 20 minutes des 24 agents conserve tous les navires en eau libre
et fait parcourir tous les points de leurs circuits aux quatre cargos.
La validation matérielle Safari/iPadOS reste distincte de l'émulation Chromium.
La phase 6 n'est pas commencée.
