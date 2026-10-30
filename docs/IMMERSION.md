# Phase 5 — baie vivante

## Trafic autonome

Le trafic comprend deux voiliers, deux bateaux de plaisance, deux ferries et deux
vedettes. Chaque définition de `src/traffic/Traffic.ts` possède une route en mètres,
un nom, une famille, des dimensions et une vitesse. Les navires suivent des trajets
dans l'avant-port, au centre de la baie, près de Dinard et au large des forts.
Ils tournent progressivement, ralentissent dans les croisements et choisissent un
écart simple à tribord ou un ralentissement pour éviter le joueur et leurs voisins.
Une vérification du littoral, des quais et des rochers empêche les trajets sur terre.
Les comportements sont des règles de jeu, sans valeur de règlement maritime réel.

Le profil léger limite le trafic à six navires ; les autres profils en autorisent
huit. La nuit en conserve trois ; la mer agitée ou une visibilité réduite diminuent
le trafic et les vitesses. Les suppressions se font loin du joueur et les nouvelles
activations à plus de 180 m pour éviter les apparitions à proximité immédiate.
Les navires proches sont conservés temporairement lors d'une baisse de densité.

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

Au maximum 40 silhouettes par groupe représentent les passagers. Corps et têtes
utilisent chacun un dessin instancié ; seules trois silhouettes partagent un mouvement
sur une passerelle pendant l'embarquement ou le débarquement. Le groupe du quai est
placé sur le quai le plus proche, à sa hauteur simulée, et le groupe du pont suit le
navire et ses mouvements. Il ne s'agit pas d'un personnage animé pour chaque passager.

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

Le trafic compte au plus huit agents. Les décisions de route sont calculées à 10 Hz
près du joueur et 2 Hz au loin ; les positions sont intégrées au pas physique fixe.
Au-delà de 1 100 m de la caméra, la superstructure disparaît. Les foules sont mises
à jour à 5 Hz, le radar et les affichages à 5 Hz, sans ajout de dépendance npm.
Dans le cadrage externe initial à 1 024 × 768, Chromium en profil léger a mesuré
92 appels de dessin et 75 264 triangles avec six navires actifs et 48 passagers,
contre 87 appels et 74 164 triangles avec le trafic et la foule masqués. Le coût
dépend du cadrage et des objets visibles ; ces chiffres ne garantissent pas une
cadence sur iPad. Le signal Web Audio a également été mesuré, puis sa suspension
en pause vérifiée.

Les tests couvrent trajectoires, virages, densité, prédiction des croisements,
contacts et dégâts, indépendance du rendu, passagers, confort, annonces, validation
des textes et mode sans voix française. Les essais navigateur vérifient également
la 3D, les positions radar, l'édition persistante et les formats ordinateur/iPad.
La validation matérielle Safari/iPadOS reste distincte de l'émulation Chromium.
La phase 6 n'est pas commencée.
